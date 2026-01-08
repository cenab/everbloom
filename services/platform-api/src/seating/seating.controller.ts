import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SeatingService } from './seating.service';
import { WeddingService } from '../wedding/wedding.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import type {
  ApiResponse,
  SeatingTable,
  TableListResponse,
  SeatingOverviewResponse,
  CreateTableRequest,
  UpdateTableRequest,
  AssignGuestsToTableRequest,
  UnassignGuestsRequest,
  UpdateSeatingResponse,
} from '../types';
import {
  TABLE_NOT_FOUND,
  TABLE_CAPACITY_EXCEEDED,
  WEDDING_NOT_FOUND,
  FEATURE_DISABLED,
  VALIDATION_ERROR,
} from '../types';

@Controller('weddings/:weddingId/seating')
export class SeatingController {
  constructor(
    private readonly seatingService: SeatingService,
    private readonly weddingService: WeddingService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Get seating overview (tables with guests and unassigned list)
   * PRD: "Admin can create table assignments"
   */
  @Get()
  async getSeatingOverview(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<SeatingOverviewResponse>> {
    const { wedding } = await this.requireWeddingOwnerWithFeature(
      authHeader,
      weddingId,
    );

    const overview = this.seatingService.getSeatingOverview(weddingId);
    return { ok: true, data: overview };
  }

  /**
   * Get all tables for a wedding
   */
  @Get('tables')
  async listTables(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<TableListResponse>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    const tables = this.seatingService.getTablesForWedding(weddingId);
    return { ok: true, data: { tables } };
  }

  /**
   * Create a new table
   * PRD: "Admin can create table assignments"
   */
  @Post('tables')
  async createTable(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateTableRequest,
  ): Promise<ApiResponse<SeatingTable>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    // Validate request
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Table name is required',
      });
    }

    if (!body.capacity || body.capacity < 1) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Table capacity must be at least 1',
      });
    }

    const table = await this.seatingService.createTable(weddingId, body);
    return { ok: true, data: table };
  }

  /**
   * Get a specific table with its guests
   */
  @Get('tables/:tableId')
  async getTable(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tableId') tableId: string,
  ): Promise<
    ApiResponse<{
      table: SeatingTable;
      guests: Array<{ id: string; name: string; seatNumber?: number }>;
    }>
  > {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    const table = this.seatingService.getTable(tableId);
    if (!table || table.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    const overview = this.seatingService.getSeatingOverview(weddingId);
    const tableData = overview.tables.find((t) => t.table.id === tableId);

    return {
      ok: true,
      data: {
        table,
        guests: tableData?.guests || [],
      },
    };
  }

  /**
   * Update a table
   */
  @Put('tables/:tableId')
  async updateTable(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tableId') tableId: string,
    @Body() body: UpdateTableRequest,
  ): Promise<ApiResponse<SeatingTable>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    const table = this.seatingService.getTable(tableId);
    if (!table || table.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    // Validate capacity if being updated
    if (body.capacity !== undefined && body.capacity < 1) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Table capacity must be at least 1',
      });
    }

    // Check if new capacity would be less than current assignments
    if (body.capacity !== undefined) {
      const guests = this.seatingService.getGuestsAtTable(tableId);
      if (body.capacity < guests.length) {
        throw new BadRequestException({
          ok: false,
          error: TABLE_CAPACITY_EXCEEDED,
          message: `Cannot reduce capacity below current assignment count (${guests.length})`,
        });
      }
    }

    const updated = await this.seatingService.updateTable(tableId, body);
    if (!updated) {
      throw new NotFoundException({
        ok: false,
        error: TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    return { ok: true, data: updated };
  }

  /**
   * Delete a table
   */
  @Delete('tables/:tableId')
  async deleteTable(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tableId') tableId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    const table = this.seatingService.getTable(tableId);
    if (!table || table.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    await this.seatingService.deleteTable(tableId);

    // Update render_config
    await this.updateRenderConfig(weddingId);

    return { ok: true, data: { deleted: true } };
  }

  /**
   * Reorder tables
   */
  @Put('tables/reorder')
  async reorderTables(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: { tableIds: string[] },
  ): Promise<ApiResponse<TableListResponse>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    if (!body.tableIds || !Array.isArray(body.tableIds)) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'tableIds array is required',
      });
    }

    // Validate all table IDs belong to this wedding
    for (const tableId of body.tableIds) {
      if (!this.seatingService.tableBelongsToWedding(tableId, weddingId)) {
        throw new NotFoundException({
          ok: false,
          error: TABLE_NOT_FOUND,
          message: `Table ${tableId} not found`,
        });
      }
    }

    const tables = await this.seatingService.reorderTables(
      weddingId,
      body.tableIds,
    );

    // Update render_config
    await this.updateRenderConfig(weddingId);

    return { ok: true, data: { tables } };
  }

  /**
   * Assign guests to a table
   * PRD: "Admin can assign guests to tables"
   */
  @Post('assign')
  async assignGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: AssignGuestsToTableRequest,
  ): Promise<
    ApiResponse<{
      assigned: string[];
      errors: Array<{ guestId: string; error: string }>;
    }>
  > {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    // Validate request
    if (!body.guestIds || body.guestIds.length === 0) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'At least one guest must be selected',
      });
    }

    if (!body.tableId) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'Table ID is required',
      });
    }

    // Validate table belongs to this wedding
    if (!this.seatingService.tableBelongsToWedding(body.tableId, weddingId)) {
      throw new NotFoundException({
        ok: false,
        error: TABLE_NOT_FOUND,
        message: 'Table not found',
      });
    }

    try {
      const result = await this.seatingService.assignGuestsToTable(
        weddingId,
        body.tableId,
        body.guestIds,
      );

      // Update render_config
      await this.updateRenderConfig(weddingId);

      return { ok: true, data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'TABLE_NOT_FOUND') {
        throw new NotFoundException({
          ok: false,
          error: TABLE_NOT_FOUND,
          message: 'Table not found',
        });
      }
      throw error;
    }
  }

  /**
   * Unassign guests from their tables
   */
  @Post('unassign')
  async unassignGuests(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: UnassignGuestsRequest,
  ): Promise<ApiResponse<{ unassigned: number }>> {
    await this.requireWeddingOwnerWithFeature(authHeader, weddingId);

    // Validate request
    if (!body.guestIds || body.guestIds.length === 0) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
        message: 'At least one guest must be selected',
      });
    }

    const unassigned = await this.seatingService.unassignGuests(body.guestIds);

    // Update render_config
    await this.updateRenderConfig(weddingId);

    return { ok: true, data: { unassigned } };
  }

  /**
   * Update render_config with current seating data
   */
  private async updateRenderConfig(weddingId: string): Promise<void> {
    const seatingConfig = this.seatingService.getSeatingConfig(weddingId);
    await this.weddingService.updateSeatingConfig(weddingId, seatingConfig);
  }

  /**
   * Validate auth token and verify user owns the wedding with SEATING_CHART enabled
   */
  private async requireWeddingOwnerWithFeature(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const user = await this.adminAuthService.requireAdmin(authHeader);

    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    // Check if SEATING_CHART feature is enabled
    if (!wedding.features?.SEATING_CHART) {
      throw new ForbiddenException({ ok: false, error: FEATURE_DISABLED });
    }

    return { user, wedding };
  }
}
