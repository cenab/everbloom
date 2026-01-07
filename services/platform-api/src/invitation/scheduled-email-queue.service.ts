import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import type { ScheduledEmailJobData } from '../types';
import { SCHEDULED_EMAIL_QUEUE_NAME } from '../types';

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
export class ScheduledEmailQueueService {
  private readonly logger = new Logger(ScheduledEmailQueueService.name);
  private readonly queue = new Queue<ScheduledEmailJobData>(
    SCHEDULED_EMAIL_QUEUE_NAME,
    {
      connection: getRedisConnection(),
    },
  );

  /**
   * Schedule an email to be sent at a future time
   * Uses BullMQ's delay option for scheduled sends
   *
   * @param jobData - The email job data
   * @param scheduledAt - ISO timestamp when the email should be sent
   * @returns The job ID
   */
  async scheduleEmail(
    jobData: ScheduledEmailJobData,
    scheduledAt: string,
  ): Promise<string> {
    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, scheduledTime - now);

    this.logger.log(
      `Scheduling email ${jobData.scheduledEmailId} for ${scheduledAt} (delay: ${delay}ms)`,
    );

    const job = await this.queue.add('send-scheduled-email', jobData, {
      jobId: jobData.scheduledEmailId,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });

    return job.id ? job.id.toString() : jobData.scheduledEmailId;
  }

  /**
   * Cancel a scheduled email job
   *
   * @param scheduledEmailId - The scheduled email ID (which is the job ID)
   * @returns true if the job was successfully removed, false if not found
   */
  async cancelScheduledEmail(scheduledEmailId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(scheduledEmailId);
      if (!job) {
        this.logger.warn(`Scheduled email job ${scheduledEmailId} not found`);
        return false;
      }

      // Check if job is already being processed or completed
      const state = await job.getState();
      if (state === 'active' || state === 'completed') {
        this.logger.warn(
          `Cannot cancel scheduled email ${scheduledEmailId} - state: ${state}`,
        );
        return false;
      }

      await job.remove();
      this.logger.log(`Cancelled scheduled email job ${scheduledEmailId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error cancelling scheduled email ${scheduledEmailId}: ${error}`,
      );
      return false;
    }
  }

  /**
   * Get all pending scheduled email jobs for a wedding
   *
   * @param weddingId - The wedding ID to filter by
   * @returns Array of pending scheduled email jobs
   */
  async getPendingScheduledEmails(
    weddingId: string,
  ): Promise<Array<{ jobId: string; data: ScheduledEmailJobData; scheduledAt: Date }>> {
    const jobs = await this.queue.getJobs(['delayed', 'waiting']);
    const weddingJobs = jobs.filter(
      (job: Job<ScheduledEmailJobData>) => job.data.weddingId === weddingId,
    );

    return weddingJobs.map((job: Job<ScheduledEmailJobData>) => ({
      jobId: job.id ? job.id.toString() : '',
      data: job.data,
      scheduledAt: new Date(job.timestamp + (job.opts.delay || 0)),
    }));
  }
}
