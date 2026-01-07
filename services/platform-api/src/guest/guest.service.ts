import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  Guest,
  RsvpStatus,
  CreateGuestRequest,
  UpdateGuestRequest,
} from '@wedding-bestie/shared';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  // In-memory store for development
  private guests: Map<string, Guest> = new Map();

  /**
   * Generate a secure RSVP token for a guest
   */
  private generateRsvpToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new guest for a wedding
   */
  async createGuest(
    weddingId: string,
    request: CreateGuestRequest,
  ): Promise<Guest> {
    // Check for duplicate email in same wedding
    const existing = this.findByEmail(weddingId, request.email);
    if (existing) {
      throw new Error('GUEST_ALREADY_EXISTS');
    }

    const now = new Date().toISOString();
    const guestId = randomBytes(16).toString('hex');

    const guest: Guest = {
      id: guestId,
      weddingId,
      name: request.name,
      email: request.email,
      partySize: request.partySize ?? 1,
      rsvpStatus: 'pending' as RsvpStatus,
      rsvpToken: this.generateRsvpToken(),
      createdAt: now,
      updatedAt: now,
    };

    this.guests.set(guestId, guest);
    this.logger.log(`Created guest ${guestId} for wedding ${weddingId}`);

    return guest;
  }

  /**
   * Update an existing guest
   */
  async updateGuest(
    guestId: string,
    request: UpdateGuestRequest,
  ): Promise<Guest | null> {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    const updated: Guest = {
      ...guest,
      name: request.name ?? guest.name,
      email: request.email ?? guest.email,
      partySize: request.partySize ?? guest.partySize,
      dietaryNotes: request.dietaryNotes ?? guest.dietaryNotes,
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(`Updated guest ${guestId}`);

    return updated;
  }

  /**
   * Delete a guest
   */
  async deleteGuest(guestId: string): Promise<boolean> {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return false;
    }

    this.guests.delete(guestId);
    this.logger.log(`Deleted guest ${guestId}`);

    return true;
  }

  /**
   * Get a guest by ID
   */
  getGuest(guestId: string): Guest | null {
    return this.guests.get(guestId) || null;
  }

  /**
   * Get all guests for a wedding
   */
  getGuestsForWedding(weddingId: string): Guest[] {
    const weddingGuests: Guest[] = [];
    for (const guest of this.guests.values()) {
      if (guest.weddingId === weddingId) {
        weddingGuests.push(guest);
      }
    }
    // Sort by name alphabetically
    return weddingGuests.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Find a guest by email in a wedding
   */
  private findByEmail(weddingId: string, email: string): Guest | null {
    const normalizedEmail = email.toLowerCase();
    for (const guest of this.guests.values()) {
      if (
        guest.weddingId === weddingId &&
        guest.email.toLowerCase() === normalizedEmail
      ) {
        return guest;
      }
    }
    return null;
  }

  /**
   * Get guest count summary for a wedding
   */
  getGuestSummary(weddingId: string): {
    total: number;
    attending: number;
    notAttending: number;
    pending: number;
    totalPartySize: number;
  } {
    const guests = this.getGuestsForWedding(weddingId);

    const summary = {
      total: guests.length,
      attending: 0,
      notAttending: 0,
      pending: 0,
      totalPartySize: 0,
    };

    for (const guest of guests) {
      switch (guest.rsvpStatus) {
        case 'attending':
          summary.attending++;
          summary.totalPartySize += guest.partySize;
          break;
        case 'not_attending':
          summary.notAttending++;
          break;
        case 'pending':
          summary.pending++;
          break;
      }
    }

    return summary;
  }
}
