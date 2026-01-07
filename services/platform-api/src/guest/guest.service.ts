import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import type {
  Guest,
  RsvpStatus,
  CreateGuestRequest,
  UpdateGuestRequest,
  CsvGuestRow,
  CsvImportRowResult,
  PlusOneGuest,
  EventRsvpMap,
  EventGuestAssignment,
} from '../types';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  // In-memory store for development
  private guests: Map<string, Guest> = new Map();

  // In-memory store for event-guest assignments
  // Key format: "{weddingId}:{eventId}:{guestId}"
  private eventGuestAssignments: Map<string, EventGuestAssignment> = new Map();

  /**
   * Generate a secure RSVP token for a guest
   * Returns 32 bytes of random data as hex (64 character string)
   */
  private generateRsvpToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash an RSVP token using SHA-256
   * Only the hash is stored - the raw token is never persisted
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify a token against a stored hash using timing-safe comparison
   * This prevents timing attacks that could leak information about token structure
   */
  private verifyToken(candidateToken: string, storedHash: string): boolean {
    const candidateHash = this.hashToken(candidateToken);
    // Both hashes are 64 character hex strings (SHA-256)
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    // Timing-safe comparison prevents timing attacks
    return timingSafeEqual(candidateBuffer, storedBuffer);
  }

  /**
   * Create a new guest for a wedding
   * Returns both the guest and the raw RSVP token for email sending
   * The raw token is NOT stored - only its hash is persisted
   */
  async createGuest(
    weddingId: string,
    request: CreateGuestRequest,
  ): Promise<{ guest: Guest; rawToken: string }> {
    // Check for duplicate email in same wedding
    const existing = this.findByEmail(weddingId, request.email);
    if (existing) {
      throw new Error('GUEST_ALREADY_EXISTS');
    }

    const now = new Date().toISOString();
    const guestId = randomBytes(16).toString('hex');

    // Generate raw token and hash it for storage
    const rawToken = this.generateRsvpToken();
    const tokenHash = this.hashToken(rawToken);

    const guest: Guest = {
      id: guestId,
      weddingId,
      name: request.name,
      email: request.email,
      partySize: request.partySize ?? 1,
      rsvpStatus: 'pending' as RsvpStatus,
      rsvpTokenHash: tokenHash, // Store hash, not raw token
      plusOneAllowance: request.plusOneAllowance,
      createdAt: now,
      updatedAt: now,
    };

    this.guests.set(guestId, guest);
    this.logger.log(`Created guest ${guestId} for wedding ${weddingId}`);

    // Return both guest and raw token (for immediate email sending)
    return { guest, rawToken };
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
      plusOneAllowance: request.plusOneAllowance !== undefined ? request.plusOneAllowance : guest.plusOneAllowance,
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
        // createGuest returns { guest, rawToken }
        // We discard rawToken - it will be regenerated when sending invitations
        const { guest } = await this.createGuest(weddingId, {
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
   * Find a guest by RSVP token using timing-safe comparison
   * The token is hashed and compared against the stored hash
   */
  getGuestByRsvpToken(token: string): Guest | null {
    for (const guest of this.guests.values()) {
      if (guest.rsvpTokenHash && this.verifyToken(token, guest.rsvpTokenHash)) {
        return guest;
      }
    }
    return null;
  }

  /**
   * Regenerate RSVP token for a guest
   * Used when sending invitation/reminder emails
   * Returns the new raw token for email URL - the hash is stored
   * This invalidates any previous RSVP links for security
   */
  regenerateRsvpToken(guestId: string): { guest: Guest; rawToken: string } | null {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    // Generate new raw token and hash for storage
    const rawToken = this.generateRsvpToken();
    const tokenHash = this.hashToken(rawToken);

    const updated: Guest = {
      ...guest,
      rsvpTokenHash: tokenHash,
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(`Regenerated RSVP token for guest ${guestId}`);

    return { guest: updated, rawToken };
  }

  /**
   * Update guest RSVP status with optional plus-one guests and meal options
   * @param guestId - The guest ID
   * @param rsvpStatus - The RSVP status
   * @param partySize - Total party size (including the guest)
   * @param dietaryNotes - Dietary notes for the primary guest
   * @param plusOneGuests - Plus-one guest details (names, dietary notes, and meal options)
   * @param mealOptionId - Selected meal option for the primary guest
   * @returns Updated guest or null if not found
   * @throws Error with 'PLUS_ONE_LIMIT_EXCEEDED' if too many plus-ones provided
   */
  async updateRsvpStatus(
    guestId: string,
    rsvpStatus: RsvpStatus,
    partySize: number,
    dietaryNotes?: string,
    plusOneGuests?: PlusOneGuest[],
    mealOptionId?: string,
  ): Promise<Guest | null> {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    // Validate plus-one limit
    const allowance = guest.plusOneAllowance ?? 0;
    const plusOnesCount = plusOneGuests?.length ?? 0;

    if (plusOnesCount > allowance) {
      this.logger.warn(
        `Guest ${guestId} tried to add ${plusOnesCount} plus-ones but allowance is ${allowance}`,
      );
      throw new Error('PLUS_ONE_LIMIT_EXCEEDED');
    }

    // Validate party size matches plus-ones + 1 (the guest themselves)
    // Party size should be 1 (guest) + number of plus-ones
    const expectedPartySize = 1 + plusOnesCount;
    const actualPartySize = rsvpStatus === 'attending' ? Math.max(partySize, expectedPartySize) : partySize;

    const updated: Guest = {
      ...guest,
      rsvpStatus,
      partySize: actualPartySize,
      dietaryNotes: dietaryNotes ?? guest.dietaryNotes,
      plusOneGuests: rsvpStatus === 'attending' ? plusOneGuests : undefined,
      mealOptionId: rsvpStatus === 'attending' ? mealOptionId : undefined,
      rsvpSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(
      `Updated RSVP for guest ${guestId}: ${rsvpStatus}${plusOnesCount > 0 ? ` with ${plusOnesCount} plus-one(s)` : ''}${mealOptionId ? ` meal: ${mealOptionId}` : ''}`,
    );

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

  /**
   * Get meal selection summary for a wedding
   * PRD: "Admin can export meal counts"
   */
  getMealSummary(weddingId: string): {
    counts: {
      byOption: Record<string, number>;
      total: number;
      noSelection: number;
    };
    dietaryNotes: Array<{ guestName: string; notes: string }>;
  } {
    const guests = this.getGuestsForWedding(weddingId);
    const attendingGuests = guests.filter((g) => g.rsvpStatus === 'attending');

    const counts: Record<string, number> = {};
    let noSelection = 0;
    let total = 0;
    const dietaryNotes: Array<{ guestName: string; notes: string }> = [];

    for (const guest of attendingGuests) {
      // Count primary guest meal selection
      if (guest.mealOptionId) {
        counts[guest.mealOptionId] = (counts[guest.mealOptionId] || 0) + 1;
        total++;
      } else {
        noSelection++;
      }

      // Collect primary guest dietary notes
      if (guest.dietaryNotes?.trim()) {
        dietaryNotes.push({
          guestName: guest.name,
          notes: guest.dietaryNotes.trim(),
        });
      }

      // Count plus-one meal selections
      if (guest.plusOneGuests) {
        for (const plusOne of guest.plusOneGuests) {
          if (plusOne.mealOptionId) {
            counts[plusOne.mealOptionId] = (counts[plusOne.mealOptionId] || 0) + 1;
            total++;
          } else {
            noSelection++;
          }

          // Collect plus-one dietary notes
          if (plusOne.dietaryNotes?.trim()) {
            dietaryNotes.push({
              guestName: `${plusOne.name} (guest of ${guest.name})`,
              notes: plusOne.dietaryNotes.trim(),
            });
          }
        }
      }
    }

    return {
      counts: {
        byOption: counts,
        total,
        noSelection,
      },
      dietaryNotes,
    };
  }

  /**
   * Assign tags to guests
   * PRD: "Admin can create guest tags for segmentation"
   */
  async assignTagsToGuests(
    guestIds: string[],
    tagIds: string[],
  ): Promise<Guest[]> {
    const updatedGuests: Guest[] = [];

    for (const guestId of guestIds) {
      const guest = this.guests.get(guestId);
      if (!guest) {
        continue;
      }

      // Merge existing tags with new tags (no duplicates)
      const existingTags = guest.tagIds || [];
      const mergedTags = [...new Set([...existingTags, ...tagIds])];

      const updated: Guest = {
        ...guest,
        tagIds: mergedTags,
        updatedAt: new Date().toISOString(),
      };

      this.guests.set(guestId, updated);
      updatedGuests.push(updated);
    }

    this.logger.log(
      `Assigned ${tagIds.length} tags to ${updatedGuests.length} guests`,
    );

    return updatedGuests;
  }

  /**
   * Remove tags from guests
   */
  async removeTagsFromGuests(
    guestIds: string[],
    tagIds: string[],
  ): Promise<Guest[]> {
    const updatedGuests: Guest[] = [];

    for (const guestId of guestIds) {
      const guest = this.guests.get(guestId);
      if (!guest) {
        continue;
      }

      // Remove specified tags
      const existingTags = guest.tagIds || [];
      const filteredTags = existingTags.filter((t) => !tagIds.includes(t));

      const updated: Guest = {
        ...guest,
        tagIds: filteredTags.length > 0 ? filteredTags : undefined,
        updatedAt: new Date().toISOString(),
      };

      this.guests.set(guestId, updated);
      updatedGuests.push(updated);
    }

    this.logger.log(
      `Removed ${tagIds.length} tags from ${updatedGuests.length} guests`,
    );

    return updatedGuests;
  }

  /**
   * Get guests filtered by tag IDs
   * PRD: "Admin can filter guests by tag"
   */
  getGuestsByTags(weddingId: string, tagIds: string[]): Guest[] {
    const weddingGuests = this.getGuestsForWedding(weddingId);

    // Return guests that have at least one of the specified tags
    return weddingGuests.filter((guest) => {
      if (!guest.tagIds || guest.tagIds.length === 0) {
        return false;
      }
      return guest.tagIds.some((tagId) => tagIds.includes(tagId));
    });
  }

  /**
   * Remove a specific tag from all guests in a wedding (used when deleting a tag)
   */
  async removeTagFromAllGuests(weddingId: string, tagId: string): Promise<void> {
    const guests = this.getGuestsForWedding(weddingId);

    for (const guest of guests) {
      if (guest.tagIds && guest.tagIds.includes(tagId)) {
        const filteredTags = guest.tagIds.filter((t) => t !== tagId);
        const updated: Guest = {
          ...guest,
          tagIds: filteredTags.length > 0 ? filteredTags : undefined,
          updatedAt: new Date().toISOString(),
        };
        this.guests.set(guest.id, updated);
      }
    }

    this.logger.log(`Removed tag ${tagId} from all guests in wedding ${weddingId}`);
  }

  // ============================================================================
  // Event RSVP Methods (Multi-Event Support)
  // ============================================================================

  /**
   * Update per-event RSVP status for a guest
   * PRD: "Guest can RSVP to specific events"
   */
  async updateEventRsvp(
    guestId: string,
    eventRsvps: EventRsvpMap,
  ): Promise<Guest | null> {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    // Merge with existing event RSVPs
    const mergedEventRsvps: EventRsvpMap = {
      ...guest.eventRsvps,
      ...eventRsvps,
    };

    // Calculate overall RSVP status from per-event responses
    // If attending any event, overall status is 'attending'
    // If declined all events, overall status is 'not_attending'
    // Otherwise, 'pending'
    let overallStatus: RsvpStatus = 'pending';
    const eventResponses = Object.values(mergedEventRsvps);
    if (eventResponses.length > 0) {
      const hasAttending = eventResponses.some((r) => r.rsvpStatus === 'attending');
      const allDeclined = eventResponses.every((r) => r.rsvpStatus === 'not_attending');

      if (hasAttending) {
        overallStatus = 'attending';
      } else if (allDeclined) {
        overallStatus = 'not_attending';
      }
    }

    const updated: Guest = {
      ...guest,
      eventRsvps: mergedEventRsvps,
      rsvpStatus: overallStatus,
      rsvpSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(
      `Updated event RSVPs for guest ${guestId}: ${Object.keys(eventRsvps).length} events`,
    );

    return updated;
  }

  /**
   * Assign guests to specific events
   * PRD: "Admin can configure event-specific guest lists"
   */
  async assignGuestsToEvents(
    weddingId: string,
    guestIds: string[],
    eventIds: string[],
  ): Promise<EventGuestAssignment[]> {
    const assignments: EventGuestAssignment[] = [];
    const now = new Date().toISOString();

    for (const guestId of guestIds) {
      const guest = this.guests.get(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        continue;
      }

      for (const eventId of eventIds) {
        const key = `${weddingId}:${eventId}:${guestId}`;

        // Check if assignment already exists
        if (!this.eventGuestAssignments.has(key)) {
          const assignment: EventGuestAssignment = {
            eventId,
            guestId,
            assignedAt: now,
          };
          this.eventGuestAssignments.set(key, assignment);
          assignments.push(assignment);
        }
      }

      // Update guest's invitedEventIds
      const existingEventIds = guest.invitedEventIds || [];
      const mergedEventIds = [...new Set([...existingEventIds, ...eventIds])];

      const updated: Guest = {
        ...guest,
        invitedEventIds: mergedEventIds,
        updatedAt: now,
      };
      this.guests.set(guestId, updated);
    }

    this.logger.log(
      `Assigned ${guestIds.length} guests to ${eventIds.length} events in wedding ${weddingId}`,
    );

    return assignments;
  }

  /**
   * Remove guests from specific events
   */
  async removeGuestsFromEvents(
    weddingId: string,
    guestIds: string[],
    eventIds: string[],
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const guestId of guestIds) {
      const guest = this.guests.get(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        continue;
      }

      for (const eventId of eventIds) {
        const key = `${weddingId}:${eventId}:${guestId}`;
        this.eventGuestAssignments.delete(key);
      }

      // Update guest's invitedEventIds
      const existingEventIds = guest.invitedEventIds || [];
      const filteredEventIds = existingEventIds.filter((id) => !eventIds.includes(id));

      const updated: Guest = {
        ...guest,
        invitedEventIds: filteredEventIds.length > 0 ? filteredEventIds : undefined,
        updatedAt: now,
      };
      this.guests.set(guestId, updated);
    }

    this.logger.log(
      `Removed ${guestIds.length} guests from ${eventIds.length} events in wedding ${weddingId}`,
    );
  }

  /**
   * Get all event assignments for a wedding
   */
  getEventAssignments(weddingId: string): EventGuestAssignment[] {
    const assignments: EventGuestAssignment[] = [];

    for (const [key, assignment] of this.eventGuestAssignments.entries()) {
      if (key.startsWith(`${weddingId}:`)) {
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  /**
   * Get guests invited to a specific event
   */
  getGuestsForEvent(weddingId: string, eventId: string): Guest[] {
    const guests = this.getGuestsForWedding(weddingId);

    return guests.filter((guest) => {
      // If guest has no invitedEventIds, they're invited to all events (backward compatibility)
      if (!guest.invitedEventIds || guest.invitedEventIds.length === 0) {
        return true;
      }
      return guest.invitedEventIds.includes(eventId);
    });
  }

  /**
   * Get event-specific RSVP summary for a wedding
   * PRD: "Admin can view per-event attendance breakdown"
   */
  getEventRsvpSummary(
    weddingId: string,
    eventId: string,
  ): {
    total: number;
    attending: number;
    notAttending: number;
    pending: number;
    totalPartySize: number;
  } {
    const guests = this.getGuestsForEvent(weddingId, eventId);

    const summary = {
      total: guests.length,
      attending: 0,
      notAttending: 0,
      pending: 0,
      totalPartySize: 0,
    };

    for (const guest of guests) {
      // Check event-specific RSVP first
      const eventRsvp = guest.eventRsvps?.[eventId];
      const status = eventRsvp?.rsvpStatus ?? guest.rsvpStatus;

      switch (status) {
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

  /**
   * Check if a guest is invited to a specific event
   */
  isGuestInvitedToEvent(guestId: string, eventId: string): boolean {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return false;
    }

    // If no specific event invitations, guest is invited to all events
    if (!guest.invitedEventIds || guest.invitedEventIds.length === 0) {
      return true;
    }

    return guest.invitedEventIds.includes(eventId);
  }
}
