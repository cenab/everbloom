import { Worker } from 'bullmq';
import type {
  ReminderJobData,
  ScheduledEmailJobData,
  UpdateOutboxStatusRequest,
} from './types.js';
import { REMINDER_QUEUE_NAME, SCHEDULED_EMAIL_QUEUE_NAME } from './types.js';

type RedisConnection = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
};

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function getRequestTimeoutMs(): number {
  const timeoutMs = Number(process.env.WORKER_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

function getRedisConnection(): RedisConnection {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    const connection: RedisConnection = {
      host: url.hostname,
      port: url.port ? Number(url.port) : DEFAULT_REDIS_PORT,
    };

    if (url.username) {
      connection.username = decodeURIComponent(url.username);
    }

    if (url.password) {
      connection.password = decodeURIComponent(url.password);
    }

    if (url.pathname && url.pathname !== '/') {
      const db = Number(url.pathname.slice(1));
      if (!Number.isNaN(db)) {
        connection.db = db;
      }
    }

    if (url.protocol === 'rediss:') {
      connection.tls = {};
    }

    return connection;
  }

  const port = Number(process.env.REDIS_PORT || DEFAULT_REDIS_PORT);
  const connection: RedisConnection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port,
  };

  if (process.env.REDIS_PASSWORD) {
    connection.password = process.env.REDIS_PASSWORD;
  }

  return connection;
}

async function sendEmail(data: ReminderJobData): Promise<SendEmailResult> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'invites@everbloom.wedding';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Everbloom Weddings';
  const isProduction = process.env.NODE_ENV === 'production';

  if (!sendgridApiKey) {
    if (isProduction) {
      const errorMessage = 'SENDGRID_API_KEY is missing in production.';
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }

    console.log('DEVELOPMENT MODE - Reminder email would be sent.');
    console.log(`To: ${data.toName} <${data.toEmail}>`);
    console.log(`Subject: ${data.subject}`);
    return {
      success: true,
      messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  try {
    const timeoutSignal = AbortSignal.timeout(getRequestTimeoutMs());
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: timeoutSignal,
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: data.toEmail, name: data.toName }],
          },
        ],
        from: { email: fromEmail, name: fromName },
        subject: data.subject,
        content: [
          { type: 'text/plain', value: data.textBody },
          { type: 'text/html', value: data.htmlBody },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SendGrid API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `SendGrid API error: ${response.status}`,
      };
    }

    const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;
    console.log(`Reminder email sent to ${data.toEmail}, messageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send reminder email: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function reportOutboxStatus(
  weddingId: string,
  outboxId: string,
  payload: UpdateOutboxStatusRequest,
): Promise<void> {
  const apiBaseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3001/api';
  const workerToken = process.env.WORKER_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (workerToken) {
    headers['x-worker-token'] = workerToken;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/weddings/${weddingId}/invitations/outbox/${outboxId}/status`,
      {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(getRequestTimeoutMs()),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to update outbox ${outboxId}: ${response.status} - ${errorText}`,
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to update outbox ${outboxId}: ${errorMessage}`);
  }
}

const rawConcurrencyEnv = process.env.REMINDER_WORKER_CONCURRENCY;
const rawConcurrency = Number(rawConcurrencyEnv);
const concurrency = Number.isFinite(rawConcurrency) && rawConcurrency > 0
  ? rawConcurrency
  : DEFAULT_CONCURRENCY;
if (rawConcurrencyEnv && (!Number.isFinite(rawConcurrency) || rawConcurrency <= 0)) {
  console.warn(
    `Invalid REMINDER_WORKER_CONCURRENCY="${rawConcurrencyEnv}". Falling back to ${DEFAULT_CONCURRENCY}.`,
  );
}

const reminderWorker = new Worker<ReminderJobData>(
  REMINDER_QUEUE_NAME,
  async (job) => {
    const sendResult = await sendEmail(job.data);

    if (sendResult.success) {
      await reportOutboxStatus(job.data.weddingId, job.data.outboxId, { status: 'sent' });
      return { status: 'sent' };
    }

    await reportOutboxStatus(job.data.weddingId, job.data.outboxId, {
      status: 'failed',
      errorMessage: sendResult.error,
    });

    throw new Error(sendResult.error || 'Failed to send reminder');
  },
  {
    connection: getRedisConnection(),
    concurrency,
  },
);

console.log(
  `Reminder worker listening on queue "${REMINDER_QUEUE_NAME}" with concurrency ${concurrency}.`,
);

reminderWorker.on('completed', (job) => {
  console.log(`Reminder job ${job.id} completed.`);
});

reminderWorker.on('failed', (job, error) => {
  console.error(`Reminder job ${job?.id} failed: ${error.message}`);
});

// ============================================================================
// Scheduled Email Worker
// PRD: "Scheduled emails send at correct time"
// ============================================================================

async function executeScheduledEmail(
  data: ScheduledEmailJobData,
): Promise<{ sent: number; failed: number; total: number }> {
  const apiBaseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3001/api';
  const workerToken = process.env.WORKER_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (workerToken) {
    headers['x-worker-token'] = workerToken;
  }

  // The platform API handles the actual email sending
  // We just trigger it by calling a special endpoint
  try {
    const response = await fetch(
      `${apiBaseUrl}/weddings/${data.weddingId}/invitations/execute-scheduled`,
      {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(getRequestTimeoutMs()),
        body: JSON.stringify({
          scheduledEmailId: data.scheduledEmailId,
          guestIds: data.guestIds,
          emailType: data.emailType,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to execute scheduled email ${data.scheduledEmailId}: ${response.status} - ${errorText}`,
      );
      return { sent: 0, failed: data.guestIds.length, total: data.guestIds.length };
    }

    const result = await response.json() as {
      ok: boolean;
      data?: { sent: number; failed: number; total: number };
    };

    if (result.ok && result.data) {
      return result.data;
    }

    return { sent: 0, failed: data.guestIds.length, total: data.guestIds.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `Failed to execute scheduled email ${data.scheduledEmailId}: ${errorMessage}`,
    );
    return { sent: 0, failed: data.guestIds.length, total: data.guestIds.length };
  }
}

const scheduledEmailWorker = new Worker<ScheduledEmailJobData>(
  SCHEDULED_EMAIL_QUEUE_NAME,
  async (job) => {
    console.log(`Processing scheduled email ${job.data.scheduledEmailId}...`);
    const result = await executeScheduledEmail(job.data);

    console.log(
      `Scheduled email ${job.data.scheduledEmailId} completed: ${result.sent} sent, ${result.failed} failed`,
    );

    if (result.failed > 0 && result.sent === 0) {
      throw new Error(`All ${result.failed} emails failed to send`);
    }

    return result;
  },
  {
    connection: getRedisConnection(),
    concurrency,
  },
);

console.log(
  `Scheduled email worker listening on queue "${SCHEDULED_EMAIL_QUEUE_NAME}" with concurrency ${concurrency}.`,
);

scheduledEmailWorker.on('completed', (job) => {
  console.log(`Scheduled email job ${job.id} completed.`);
});

scheduledEmailWorker.on('failed', (job, error) => {
  console.error(`Scheduled email job ${job?.id} failed: ${error.message}`);
});

let shuttingDown = false;
const handleShutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}. Closing workers...`);
  await reminderWorker.close();
  await scheduledEmailWorker.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void handleShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void handleShutdown('SIGTERM');
});
