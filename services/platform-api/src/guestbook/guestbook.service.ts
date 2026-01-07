import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  GuestbookMessage,
  GuestbookMessageStatus,
  GuestbookConfig,
} from '../types';

@Injectable()
export class GuestbookService {
  private readonly logger = new Logger(GuestbookService.name);

  // In-memory store for development
  private messages: Map<string, GuestbookMessage> = new Map();

  /**
   * Submit a new guestbook message (public endpoint)
   * Messages start as pending until moderated
   */
  async submitMessage(
    weddingId: string,
    guestName: string,
    messageContent: string,
  ): Promise<GuestbookMessage> {
    const now = new Date().toISOString();
    const messageId = randomBytes(16).toString('hex');

    const message: GuestbookMessage = {
      id: messageId,
      weddingId,
      guestName,
      message: messageContent,
      status: 'pending',
      createdAt: now,
    };

    this.messages.set(messageId, message);
    this.logger.log(`New guestbook message ${messageId} for wedding ${weddingId}`);

    return message;
  }

  /**
   * Get all messages for a wedding (admin view - includes all statuses)
   */
  getMessagesForWedding(weddingId: string): GuestbookMessage[] {
    const messages: GuestbookMessage[] = [];
    for (const message of this.messages.values()) {
      if (message.weddingId === weddingId) {
        messages.push(message);
      }
    }
    // Sort by createdAt descending (newest first)
    return messages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Get approved messages for a wedding (public display)
   */
  getApprovedMessages(weddingId: string): GuestbookMessage[] {
    return this.getMessagesForWedding(weddingId).filter(
      (m) => m.status === 'approved',
    );
  }

  /**
   * Get a single message by ID
   */
  getMessage(messageId: string): GuestbookMessage | null {
    return this.messages.get(messageId) || null;
  }

  /**
   * Moderate a message (approve or reject)
   */
  async moderateMessage(
    messageId: string,
    status: 'approved' | 'rejected',
  ): Promise<GuestbookMessage | null> {
    const message = this.messages.get(messageId);
    if (!message) {
      return null;
    }

    message.status = status;
    message.moderatedAt = new Date().toISOString();

    this.messages.set(messageId, message);
    this.logger.log(`Moderated message ${messageId} to ${status}`);

    return message;
  }

  /**
   * Delete a message (admin action)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const existed = this.messages.has(messageId);
    if (existed) {
      this.messages.delete(messageId);
      this.logger.log(`Deleted guestbook message ${messageId}`);
    }
    return existed;
  }

  /**
   * Get guestbook config for render_config (approved messages only)
   */
  getGuestbookConfig(weddingId: string): GuestbookConfig {
    return {
      messages: this.getApprovedMessages(weddingId),
    };
  }

  /**
   * Get message counts for dashboard summary
   */
  getMessageCounts(weddingId: string): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    const messages = this.getMessagesForWedding(weddingId);
    return {
      total: messages.length,
      pending: messages.filter((m) => m.status === 'pending').length,
      approved: messages.filter((m) => m.status === 'approved').length,
      rejected: messages.filter((m) => m.status === 'rejected').length,
    };
  }
}
