import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  SeatingTable,
  SeatingAssignment,
  SeatingConfig,
  CreateTableRequest,
  UpdateTableRequest,
} from '../types';
import { GuestService } from '../guest/guest.service';

@Injectable()
export class SeatingService {
  private readonly logger = new Logger(SeatingService.name);

  // In-memory stores for development
  private tables: Map<string, SeatingTable> = new Map();
  private assignments: Map<string, SeatingAssignment> = new Map(); // keyed by guestId

  constructor(
    @Inject(forwardRef(() => GuestService))
    private readonly guestService: GuestService,
  ) {}

  /**
   * Create a new table for a wedding
   */
  async createTable(
    weddingId: string,
    request: CreateTableRequest,
  ): Promise<SeatingTable> {
    const tableId = randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    // Get existing tables to determine order
    const existingTables = this.getTablesForWedding(weddingId);
    const maxOrder = existingTables.reduce(
      (max, t) => Math.max(max, t.order),
      0,
    );

    const table: SeatingTable = {
      id: tableId,
      weddingId,
      name: request.name.trim(),
      capacity: request.capacity,
      notes: request.notes?.trim(),
      order: maxOrder + 1,
      createdAt: now,
    };

    this.tables.set(tableId, table);
    this.logger.log(
      `Created table ${tableId} for wedding ${weddingId}: ${table.name} (capacity: ${table.capacity})`,
    );

    return table;
  }

  /**
   * Update an existing table
   */
  async updateTable(
    tableId: string,
    request: UpdateTableRequest,
  ): Promise<SeatingTable | null> {
    const table = this.tables.get(tableId);
    if (!table) {
      return null;
    }

    const updated: SeatingTable = {
      ...table,
      name: request.name?.trim() ?? table.name,
      capacity: request.capacity ?? table.capacity,
      notes: request.notes !== undefined ? request.notes?.trim() : table.notes,
    };

    this.tables.set(tableId, updated);
    this.logger.log(`Updated table ${tableId}`);

    return updated;
  }

  /**
   * Delete a table and unassign all guests from it
   */
  async deleteTable(tableId: string): Promise<boolean> {
    const table = this.tables.get(tableId);
    if (!table) {
      return false;
    }

    // Remove all assignments for this table
    for (const [guestId, assignment] of this.assignments.entries()) {
      if (assignment.tableId === tableId) {
        this.assignments.delete(guestId);
      }
    }

    this.tables.delete(tableId);
    this.logger.log(`Deleted table ${tableId}`);

    return true;
  }

  /**
   * Reorder tables
   */
  async reorderTables(
    weddingId: string,
    tableIds: string[],
  ): Promise<SeatingTable[]> {
    const tables = this.getTablesForWedding(weddingId);
    const tableMap = new Map(tables.map((t) => [t.id, t]));

    // Update order based on position in array
    tableIds.forEach((tableId, index) => {
      const table = tableMap.get(tableId);
      if (table) {
        const updated = { ...table, order: index + 1 };
        this.tables.set(tableId, updated);
      }
    });

    return this.getTablesForWedding(weddingId);
  }

  /**
   * Get a table by ID
   */
  getTable(tableId: string): SeatingTable | null {
    return this.tables.get(tableId) || null;
  }

  /**
   * Get all tables for a wedding
   */
  getTablesForWedding(weddingId: string): SeatingTable[] {
    const weddingTables: SeatingTable[] = [];
    for (const table of this.tables.values()) {
      if (table.weddingId === weddingId) {
        weddingTables.push(table);
      }
    }
    // Sort by order
    return weddingTables.sort((a, b) => a.order - b.order);
  }

  /**
   * Check if a table belongs to a wedding
   */
  tableBelongsToWedding(tableId: string, weddingId: string): boolean {
    const table = this.tables.get(tableId);
    return table !== null && table !== undefined && table.weddingId === weddingId;
  }

  /**
   * Assign guests to a table
   */
  async assignGuestsToTable(
    weddingId: string,
    tableId: string,
    guestIds: string[],
  ): Promise<{ assigned: string[]; errors: Array<{ guestId: string; error: string }> }> {
    const table = this.tables.get(tableId);
    if (!table || table.weddingId !== weddingId) {
      throw new Error('TABLE_NOT_FOUND');
    }

    // Get current assignments for this table
    const currentAssignments = this.getGuestsAtTable(tableId);
    const currentCount = currentAssignments.length;

    const assigned: string[] = [];
    const errors: Array<{ guestId: string; error: string }> = [];

    for (const guestId of guestIds) {
      // Check capacity
      if (currentCount + assigned.length >= table.capacity) {
        errors.push({ guestId, error: 'TABLE_CAPACITY_EXCEEDED' });
        continue;
      }

      // Check if guest belongs to this wedding
      const guest = this.guestService.getGuest(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        errors.push({ guestId, error: 'GUEST_NOT_FOUND' });
        continue;
      }

      // Remove any existing assignment (guest can only be at one table)
      this.assignments.delete(guestId);

      // Create new assignment
      const assignment: SeatingAssignment = {
        guestId,
        tableId,
        assignedAt: new Date().toISOString(),
      };
      this.assignments.set(guestId, assignment);
      assigned.push(guestId);
    }

    this.logger.log(
      `Assigned ${assigned.length} guests to table ${tableId} (${errors.length} errors)`,
    );

    return { assigned, errors };
  }

  /**
   * Remove guests from their tables
   */
  async unassignGuests(guestIds: string[]): Promise<number> {
    let count = 0;
    for (const guestId of guestIds) {
      if (this.assignments.delete(guestId)) {
        count++;
      }
    }
    this.logger.log(`Unassigned ${count} guests from their tables`);
    return count;
  }

  /**
   * Get guests assigned to a specific table
   */
  getGuestsAtTable(tableId: string): Array<{ guestId: string; seatNumber?: number }> {
    const guests: Array<{ guestId: string; seatNumber?: number }> = [];
    for (const [guestId, assignment] of this.assignments.entries()) {
      if (assignment.tableId === tableId) {
        guests.push({
          guestId,
          seatNumber: assignment.seatNumber,
        });
      }
    }
    return guests;
  }

  /**
   * Get a guest's seating assignment
   */
  getGuestAssignment(guestId: string): SeatingAssignment | null {
    return this.assignments.get(guestId) || null;
  }

  /**
   * Get unassigned guests for a wedding (attending only)
   */
  getUnassignedGuests(weddingId: string): Array<{ id: string; name: string }> {
    const guests = this.guestService.getGuestsForWedding(weddingId);
    const unassigned: Array<{ id: string; name: string }> = [];

    for (const guest of guests) {
      // Only include attending guests as candidates for seating
      if (guest.rsvpStatus === 'attending' && !this.assignments.has(guest.id)) {
        unassigned.push({ id: guest.id, name: guest.name });
      }
    }

    return unassigned.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate seating config for render_config (public display)
   * NOTE: Guest names are NOT included for privacy - only table info and guest counts
   */
  getSeatingConfig(weddingId: string): SeatingConfig {
    const tables = this.getTablesForWedding(weddingId);

    return {
      tables: tables.map((table) => {
        const guestAssignments = this.getGuestsAtTable(table.id);

        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          notes: table.notes,
          order: table.order,
          guestCount: guestAssignments.length,
        };
      }),
    };
  }

  /**
   * Get a guest's table assignment for RSVP view
   * Returns null if guest is not assigned to any table
   */
  getGuestTableAssignment(guestId: string): {
    tableName: string;
    tableId: string;
    seatNumber?: number;
    tableNotes?: string;
  } | null {
    const assignment = this.assignments.get(guestId);
    if (!assignment) {
      return null;
    }

    const table = this.tables.get(assignment.tableId);
    if (!table) {
      return null;
    }

    return {
      tableName: table.name,
      tableId: table.id,
      seatNumber: assignment.seatNumber,
      tableNotes: table.notes,
    };
  }

  /**
   * Get complete seating overview for admin
   */
  getSeatingOverview(weddingId: string): {
    tables: Array<{
      table: SeatingTable;
      guests: Array<{ id: string; name: string; seatNumber?: number }>;
      availableSeats: number;
    }>;
    unassignedGuests: Array<{ id: string; name: string }>;
    summary: {
      totalTables: number;
      totalCapacity: number;
      totalAssigned: number;
      totalUnassigned: number;
    };
  } {
    const tables = this.getTablesForWedding(weddingId);
    const unassignedGuests = this.getUnassignedGuests(weddingId);

    let totalCapacity = 0;
    let totalAssigned = 0;

    const tableData = tables.map((table) => {
      const guestAssignments = this.getGuestsAtTable(table.id);
      const guests: Array<{ id: string; name: string; seatNumber?: number }> = [];

      for (const a of guestAssignments) {
        const guest = this.guestService.getGuest(a.guestId);
        if (guest) {
          guests.push({
            id: guest.id,
            name: guest.name,
            seatNumber: a.seatNumber,
          });
        }
      }

      guests.sort((a, b) => a.name.localeCompare(b.name));

      totalCapacity += table.capacity;
      totalAssigned += guests.length;

      return {
        table,
        guests,
        availableSeats: table.capacity - guests.length,
      };
    });

    return {
      tables: tableData,
      unassignedGuests,
      summary: {
        totalTables: tables.length,
        totalCapacity,
        totalAssigned,
        totalUnassigned: unassignedGuests.length,
      },
    };
  }
}
