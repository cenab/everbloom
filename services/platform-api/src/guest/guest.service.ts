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

  // Default token expiration: 30 days
  private readonly TOKEN_EXPIRY_DAYS = 30;

  // Grace period after event date before tokens expire (7 days)
  // Allows guests to access RSVP status after the wedding
  private readonly TOKEN_POST_EVENT_GRACE_DAYS = 7;

  // Throttle last_used_at updates to prevent write amplification
  // Only update if >1 hour since last update
  private readonly LAST_USED_THROTTLE_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Generate a secure RSVP token for a guest
   * Returns 32 bytes of random data as hex (64 character string)
   * PRD: "Tokens are high entropy (128-bit+)"
   */
  private generateRsvpToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Calculate token expiration timestamp
   * If eventDate is provided, cap expiry at eventDate + grace period
   * This prevents tokens from remaining valid long after the wedding
   *
   * @param eventDate - Optional wedding/event date (ISO string)
   * @returns Token expiration timestamp (ISO string), or null if tokens should not be issued
   */
  private getTokenExpiry(eventDate?: string): string | null {
    const now = new Date();

    // Default expiry: TOKEN_EXPIRY_DAYS from now
    const defaultExpiry = new Date(now);
    defaultExpiry.setDate(defaultExpiry.getDate() + this.TOKEN_EXPIRY_DAYS);

    // If no event date provided, use default expiry
    if (!eventDate) {
      return defaultExpiry.toISOString();
    }

    // Validate event date
    const eventDateParsed = new Date(eventDate);
    if (isNaN(eventDateParsed.getTime())) {
      this.logger.warn(`Invalid eventDate: ${eventDate}, using default expiry`);
      return defaultExpiry.toISOString();
    }

    // Calculate event-based expiry: eventDate + grace period
    const eventBasedExpiry = new Date(eventDateParsed);
    eventBasedExpiry.setDate(eventBasedExpiry.getDate() + this.TOKEN_POST_EVENT_GRACE_DAYS);

    // If event + grace is in the past, refuse to mint tokens
    // This prevents issuing tokens for weddings that are already over
    if (eventBasedExpiry <= now) {
      this.logger.warn(`Event ${eventDate} + grace period is in the past, refusing to mint token`);
      return null;
    }

    // Return the earlier of default expiry vs event-based expiry
    const expiry = eventBasedExpiry < defaultExpiry ? eventBasedExpiry : defaultExpiry;
    return expiry.toISOString();
  }

  /**
   * Check if a token is expired
   */
  private isTokenExpired(expiresAt: string | undefined): boolean {
    if (!expiresAt) {
      return false; // No expiration means never expires
    }
    return new Date() > new Date(expiresAt);
  }

  /**
   * Check if enough time has passed to warrant a last_used_at update
   * Prevents write amplification from guests refreshing repeatedly
   */
  private shouldUpdateLastUsed(lastUsedAt: string | null | undefined): boolean {
    if (!lastUsedAt) {
      return true; // First use, always update
    }

    const lastUsedDate = new Date(lastUsedAt);

    // Guard against invalid dates - treat as update needed
    if (isNaN(lastUsedDate.getTime())) {
      this.logger.warn(`Invalid lastUsedAt date: ${lastUsedAt}`);
      return true;
    }

    const elapsed = Date.now() - lastUsedDate.getTime();
    return elapsed >= this.LAST_USED_THROTTLE_MS;
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
   *
   * @param weddingId - The wedding ID
   * @param request - Guest creation request
   * @param eventDate - Optional event date for token expiry capping
   * @throws Error with 'EVENT_EXPIRED' if event + grace period is in the past
   */
  async createGuest(
    weddingId: string,
    request: CreateGuestRequest,
    eventDate?: string,
  ): Promise<{ guest: Guest; rawToken: string }> {
    // Check for duplicate email in same wedding
    const existing = this.findByEmail(weddingId, request.email);
    if (existing) {
      throw new Error('GUEST_ALREADY_EXISTS');
    }

    // Check if tokens can be issued for this event date
    const tokenExpiry = this.getTokenExpiry(eventDate);
    if (tokenExpiry === null) {
      throw new Error('EVENT_EXPIRED');
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
      rsvpTokenExpiresAt: tokenExpiry,
      rsvpTokenCreatedAt: now,
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
   *
   * @param weddingId - The wedding ID
   * @param rows - CSV guest data rows
   * @param eventDate - Optional event date for token expiry capping
   */
  async importGuestsFromCsv(
    weddingId: string,
    rows: CsvGuestRow[],
    eventDate?: string,
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
        }, eventDate);

        results.push({
          row: rowNumber,
          name: row.name,
          email: row.email,
          success: true,
          guest,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'EVENT_EXPIRED') {
          results.push({
            row: rowNumber,
            name: row.name,
            email: row.email,
            success: false,
            error: 'Cannot import guests for past events',
          });
        } else {
          results.push({
            row: rowNumber,
            name: row.name,
            email: row.email,
            success: false,
            error: 'Failed to create guest',
          });
        }
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
   * PRD: "Tokens are expirable"
   * @returns Guest if found and token is valid/not expired, null otherwise
   */
  getGuestByRsvpToken(token: string): Guest | null {
    for (const guest of this.guests.values()) {
      if (guest.rsvpTokenHash && this.verifyToken(token, guest.rsvpTokenHash)) {
        // Check if token is expired
        if (this.isTokenExpired(guest.rsvpTokenExpiresAt)) {
          this.logger.warn(`RSVP token expired for guest ${guest.id}`);
          return null;
        }

        // Throttle last_used_at updates to prevent write amplification
        // Only update if >1 hour since last update
        if (this.shouldUpdateLastUsed(guest.rsvpTokenLastUsedAt)) {
          const updated: Guest = {
            ...guest,
            rsvpTokenLastUsedAt: new Date().toISOString(),
          };
          this.guests.set(guest.id, updated);
          return updated;
        }

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
   * PRD: "Tokens are high entropy, expirable"
   *
   * @param guestId - The guest ID
   * @param eventDate - Optional event date for token expiry capping
   * @returns Guest with new token and raw token, or null if guest not found
   * @throws Error with 'EVENT_EXPIRED' if event + grace period is in the past
   */
  regenerateRsvpToken(guestId: string, eventDate?: string): { guest: Guest; rawToken: string } | null {
    const guest = this.guests.get(guestId);
    if (!guest) {
      return null;
    }

    // Check if tokens can be issued for this event date
    const tokenExpiry = this.getTokenExpiry(eventDate);
    if (tokenExpiry === null) {
      throw new Error('EVENT_EXPIRED');
    }

    const now = new Date().toISOString();

    // Generate new raw token and hash for storage
    const rawToken = this.generateRsvpToken();
    const tokenHash = this.hashToken(rawToken);

    const updated: Guest = {
      ...guest,
      rsvpTokenHash: tokenHash,
      rsvpTokenExpiresAt: tokenExpiry,
      rsvpTokenCreatedAt: now,
      rsvpTokenLastUsedAt: undefined, // Reset on regeneration
      updatedAt: now,
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
   * @param photoOptOut - Guest opts out of being shown in photos
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
    photoOptOut?: boolean,
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
      photoOptOut: photoOptOut ?? guest.photoOptOut,
      rsvpSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.guests.set(guestId, updated);
    this.logger.log(
      `Updated RSVP for guest ${guestId}: ${rsvpStatus}${plusOnesCount > 0 ? ` with ${plusOnesCount} plus-one(s)` : ''}${mealOptionId ? ` meal: ${mealOptionId}` : ''}${photoOptOut ? ' (photo opt-out)' : ''}`,
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
