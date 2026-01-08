import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Throttler storage record interface.
 * Matches @nestjs/throttler v6 internal interface.
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Lua script for atomic increment with TTL.
 * - INCRs the key
 * - Sets PEXPIRE on first hit (hits == 1)
 * - Safety net: also sets PEXPIRE if TTL is missing (-1), but flags it
 * - Returns [totalHits, timeToExpire, ttlWasCorrupted]
 *
 * This prevents race conditions where two requests both see
 * the key as new and try to set different TTLs.
 */
const INCR_WITH_TTL_SCRIPT = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])

local hits = redis.call('INCR', key)
local current_ttl = redis.call('PTTL', key)
local ttl_corrupted = 0

-- Set expiry on first hit (key just created)
if hits == 1 then
  redis.call('PEXPIRE', key, ttl)
  current_ttl = redis.call('PTTL', key)
elseif current_ttl == -1 then
  -- Safety net: TTL missing on existing key (shouldn't happen)
  -- Set TTL but flag corruption for logging
  redis.call('PEXPIRE', key, ttl)
  current_ttl = redis.call('PTTL', key)
  ttl_corrupted = 1
end

return {hits, current_ttl, ttl_corrupted}
`;

/**
 * Redis-backed throttler storage.
 * Stores rate limit counters in Redis for distributed rate limiting.
 * Uses Lua script for atomic increment + TTL operations.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private redis: Redis;
  private incrWithTtlSha: string | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      const url = new URL(redisUrl);
      const options: RedisOptions = {
        host: url.hostname,
        port: parseInt(url.port, 10) || 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        db: parseInt(url.pathname.slice(1), 10) || 0,
        keyPrefix: 'throttle:',
      };

      // Enable TLS for rediss:// URLs
      if (url.protocol === 'rediss:') {
        options.tls = {};
      }

      this.redis = new Redis(options);
    } else {
      // Default local Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        keyPrefix: 'throttle:',
      });
    }

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for rate limiting');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Load the Lua script into Redis and cache the SHA.
   * Uses SCRIPT LOAD for efficiency (script sent once, then called by SHA).
   */
  private async ensureScriptLoaded(): Promise<string> {
    if (this.incrWithTtlSha) {
      return this.incrWithTtlSha;
    }

    try {
      this.incrWithTtlSha = await this.redis.script('LOAD', INCR_WITH_TTL_SCRIPT) as string;
      this.logger.debug('Loaded rate limit Lua script');
      return this.incrWithTtlSha;
    } catch (error) {
      this.logger.error('Failed to load Lua script:', error);
      throw error;
    }
  }

  /**
   * Increment the counter for a key and return the record.
   * Uses Lua script for atomic INCR + conditional PEXPIRE.
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // Validate TTL before calling Redis
    if (ttl <= 0) {
      throw new Error(`Invalid TTL: ${ttl}. TTL must be positive.`);
    }

    const fullKey = `${throttlerName}:${key}`;

    // Execute atomic Lua script
    const sha = await this.ensureScriptLoaded();
    let result: [number, number, number];

    try {
      result = await this.redis.evalsha(sha, 1, fullKey, ttl) as [number, number, number];
    } catch (error: unknown) {
      // Script may have been flushed from Redis - reload and retry once
      if (error instanceof Error && error.message.includes('NOSCRIPT')) {
        this.incrWithTtlSha = null;
        const newSha = await this.ensureScriptLoaded();
        result = await this.redis.evalsha(newSha, 1, fullKey, ttl) as [number, number, number];
      } else {
        throw error;
      }
    }

    const [totalHits, timeToExpire, ttlCorrupted] = result;

    // Log warning if TTL was missing on an existing key (shouldn't happen)
    if (ttlCorrupted === 1) {
      this.logger.warn(`TTL corruption detected for key ${fullKey} at hit ${totalHits} - TTL was missing, repaired`);
    }

    // Check if blocked (exceeded limit within current window)
    // This is "within-window blocking" - blocked until TTL expires
    // For extended blocking (penalizing repeat offenders with longer ban),
    // a separate block:{key} with its own TTL would be needed
    const isBlocked = totalHits > limit;

    // timeToBlockExpire is used for Retry-After header
    // We use the actual TTL remaining rather than blockDuration for accuracy
    const timeToBlockExpire = isBlocked ? timeToExpire : 0;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }

  /**
   * Get the current record for a key (for inspection/debugging).
   */
  async get(key: string, throttlerName: string): Promise<ThrottlerStorageRecord | undefined> {
    const fullKey = `${throttlerName}:${key}`;

    const multi = this.redis.multi();
    multi.get(fullKey);
    multi.pttl(fullKey);

    const results = await multi.exec();

    if (!results) {
      return undefined;
    }

    const [countResult, pttlResult] = results;
    const count = countResult[1] as string | null;
    const currentTTL = pttlResult[1] as number;

    if (!count || currentTTL === -2) {
      return undefined;
    }

    return {
      totalHits: parseInt(count, 10),
      timeToExpire: currentTTL > 0 ? currentTTL : 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
