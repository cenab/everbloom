import { Worker } from 'bullmq';
import type { ReminderJobData, UpdateOutboxStatusRequest } from '@wedding-bestie/shared';
import { REMINDER_QUEUE_NAME } from '@wedding-bestie/shared';

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

  if (!sendgridApiKey) {
    console.log('DEVELOPMENT MODE - Reminder email would be sent.');
    console.log(`To: ${data.toName} <${data.toEmail}>`);
    console.log(`Subject: ${data.subject}`);
    return {
      success: true,
      messageId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
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

const concurrency = Number(process.env.REMINDER_WORKER_CONCURRENCY || DEFAULT_CONCURRENCY);

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

process.on('SIGINT', async () => {
  await reminderWorker.close();
  process.exit(0);
});
