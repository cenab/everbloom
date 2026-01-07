import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  Guest,
  RsvpStatus,
  CreateGuestRequest,
  UpdateGuestRequest,
  CsvGuestRow,
  CsvImportRowResult,
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
  findByEmail(weddingId: string, email: string): Guest | null {
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
   * Import guests from CSV data
   * PRD: "Admin can import invitees via CSV"
   */
  async importGuestsFromCsv(
    weddingId: string,
    rows: CsvGuestRow[],
  ): Promise<CsvImportRowResult[]> {
    const results: CsvImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      // Validate required fields
      if (!row.name || !row.name.trim()) {
        results.push({
          row: rowNumber,
          name: row.name || '',
          email: row.email || '',
          success: false,
          error: 'Name is required',
        });
        continue;
      }

      if (!row.email || !row.email.trim()) {
        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email || '',
          success: false,
          error: 'Email is required',
        });
        continue;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email,
          success: false,
          error: 'Invalid email format',
        });
        continue;
      }

      // Check for duplicate in wedding
      const existing = this.findByEmail(weddingId, row.email.trim());
      if (existing) {
        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email,
          success: false,
          error: 'A guest with this email already exists',
        });
        continue;
      }

      // Create the guest
      try {
        const guest = await this.createGuest(weddingId, {
          name: row.name.trim(),
          email: row.email.trim(),
          partySize: row.partySize ?? 1,
        });

        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email,
          success: true,
          guest,
        });
      } catch (error) {
        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email,
          success: false,
          error: 'Failed to create guest',
        });
      }
    }

    const imported = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => !r.success).length;
    this.logger.log(
      `CSV import for wedding ${weddingId}: ${imported} imported, ${skipped} skipped`,
    );

    return results;
  }

  /**
   * Find a guest by RSVP token
   */
  getGuestByRsvpToken(token: string): Guest | null {
    for (const guest of this.guests.values()) {
      if (guest.rsvpToken === token) {
        return guest;
      }
    }
    return null;
  }

  /**
   * Update guest RSVP status
   */
  async updateRsvpStatus(
    guestId: string,
    rsvpStatus: RsvpStatus,
    partySize: number,
    dietaryNotes?: string,
  ): Promise<Guest | null> {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    const updated: Guest = {
      ...guest,
      rsvpStatus,
      partySize,
      dietaryNotes: dietaryNotes ?? guest.dietaryNotes,
      rsvpSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(`Updated RSVP for guest ${guestId}: ${rsvpStatus}`);

    return updated;
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
