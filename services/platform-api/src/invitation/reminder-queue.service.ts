import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { ReminderJobData } from '@wedding-bestie/shared';
import { REMINDER_QUEUE_NAME } from '@wedding-bestie/shared';

type RedisConnection = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
};

const DEFAULT_REDIS_PORT = 6379;

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

@Injectable()
export class ReminderQueueService {
  private readonly logger = new Logger(ReminderQueueService.name);
  private readonly queue = new Queue<ReminderJobData>(REMINDER_QUEUE_NAME, {
    connection: getRedisConnection(),
  });

  async enqueueReminders(jobs: ReminderJobData[]): Promise<string[]> {
    if (jobs.length === 0) {
      return [];
    }

    const addedJobs = await this.queue.addBulk(
      jobs.map((job) => ({
        name: 'send-reminder',
        data: job,
        opts: {
          jobId: job.outboxId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      })),
    );

    this.logger.log(`Queued ${addedJobs.length} reminder job(s).`);

    return addedJobs.map((job, index) =>
      job.id ? job.id.toString() : jobs[index]?.outboxId,
    );
  }
}
