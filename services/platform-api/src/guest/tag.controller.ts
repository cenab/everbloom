import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { GuestService } from './guest.service';
import { WeddingService } from '../wedding/wedding.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import type {
  ApiResponse,
  GuestTag,
  TagListResponse,
  CreateTagRequest,
  UpdateTagRequest,
  AssignTagsRequest,
  Guest,
  GuestListResponse,
} from '../types';
import { TAG_NOT_FOUND, TAG_ALREADY_EXISTS, WEDDING_NOT_FOUND } from '../types';

@Controller('weddings/:weddingId/tags')
export class TagController {
  constructor(
    private readonly tagService: TagService,
    private readonly guestService: GuestService,
    private readonly weddingService: WeddingService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Get all tags for a wedding
   * PRD: "Admin can create guest tags for segmentation"
   */
  @Get()
  async listTags(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
  ): Promise<ApiResponse<TagListResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const tags = this.tagService.getTagsForWedding(weddingId);
    return {
      ok: true,
      data: { tags },
    };
  }

  /**
   * Create a new tag
   * PRD: "Admin can create guest tags for segmentation"
   */
  @Post()
  async createTag(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateTagRequest,
  ): Promise<ApiResponse<GuestTag>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Validate name
    if (!body.name || !body.name.trim()) {
      throw new ConflictException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'Tag name is required',
      });
    }

    try {
      const tag = await this.tagService.createTag(weddingId, body);
      return { ok: true, data: tag };
    } catch (error) {
      if (error instanceof Error && error.message === 'TAG_ALREADY_EXISTS') {
        throw new ConflictException({
          ok: false,
          error: TAG_ALREADY_EXISTS,
          message: 'A tag with this name already exists',
        });
      }
      throw error;
    }
  }

  /**
   * Get a specific tag
   */
  @Get(':tagId')
  async getTag(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tagId') tagId: string,
  ): Promise<ApiResponse<GuestTag>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const tag = this.tagService.getTag(tagId);

    if (!tag || tag.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TAG_NOT_FOUND,
        message: 'Tag not found',
      });
    }

    return { ok: true, data: tag };
  }

  /**
   * Update a tag
   */
  @Put(':tagId')
  async updateTag(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tagId') tagId: string,
    @Body() body: UpdateTagRequest,
  ): Promise<ApiResponse<GuestTag>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const tag = this.tagService.getTag(tagId);
    if (!tag || tag.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TAG_NOT_FOUND,
        message: 'Tag not found',
      });
    }

    try {
      const updated = await this.tagService.updateTag(tagId, body);
      if (!updated) {
        throw new NotFoundException({
          ok: false,
          error: TAG_NOT_FOUND,
          message: 'Tag not found',
        });
      }

      return { ok: true, data: updated };
    } catch (error) {
      if (error instanceof Error && error.message === 'TAG_ALREADY_EXISTS') {
        throw new ConflictException({
          ok: false,
          error: TAG_ALREADY_EXISTS,
          message: 'A tag with this name already exists',
        });
      }
      throw error;
    }
  }

  /**
   * Delete a tag
   */
  @Delete(':tagId')
  async deleteTag(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Param('tagId') tagId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    const tag = this.tagService.getTag(tagId);
    if (!tag || tag.weddingId !== weddingId) {
      throw new NotFoundException({
        ok: false,
        error: TAG_NOT_FOUND,
        message: 'Tag not found',
      });
    }

    // Remove this tag from all guests before deleting
    await this.guestService.removeTagFromAllGuests(weddingId, tagId);

    await this.tagService.deleteTag(tagId);
    return { ok: true, data: { deleted: true } };
  }

  /**
   * Assign tags to multiple guests
   * PRD: "Admin can create guest tags for segmentation"
   */
  @Post('assign')
  async assignTags(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: AssignTagsRequest,
  ): Promise<ApiResponse<{ updated: number }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Validate request
    if (!body.guestIds || body.guestIds.length === 0) {
      throw new ConflictException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one guest must be selected',
      });
    }

    if (!body.tagIds || body.tagIds.length === 0) {
      throw new ConflictException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one tag must be selected',
      });
    }

    // Validate all tags belong to this wedding
    for (const tagId of body.tagIds) {
      if (!this.tagService.tagBelongsToWedding(tagId, weddingId)) {
        throw new NotFoundException({
          ok: false,
          error: TAG_NOT_FOUND,
          message: `Tag ${tagId} not found`,
        });
      }
    }

    // Validate all guests belong to this wedding
    for (const guestId of body.guestIds) {
      const guest = this.guestService.getGuest(guestId);
      if (!guest || guest.weddingId !== weddingId) {
        throw new NotFoundException({
          ok: false,
          error: 'GUEST_NOT_FOUND',
          message: `Guest ${guestId} not found`,
        });
      }
    }

    const updated = await this.guestService.assignTagsToGuests(
      body.guestIds,
      body.tagIds,
    );

    return { ok: true, data: { updated: updated.length } };
  }

  /**
   * Remove tags from multiple guests
   */
  @Post('unassign')
  async unassignTags(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Body() body: AssignTagsRequest,
  ): Promise<ApiResponse<{ updated: number }>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Validate request
    if (!body.guestIds || body.guestIds.length === 0) {
      throw new ConflictException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one guest must be selected',
      });
    }

    if (!body.tagIds || body.tagIds.length === 0) {
      throw new ConflictException({
        ok: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one tag must be selected',
      });
    }

    const updated = await this.guestService.removeTagsFromGuests(
      body.guestIds,
      body.tagIds,
    );

    return { ok: true, data: { updated: updated.length } };
  }

  /**
   * Get guests filtered by tags
   * PRD: "Admin can filter guests by tag"
   */
  @Get('filter/guests')
  async getGuestsByTags(
    @Headers('authorization') authHeader: string,
    @Param('weddingId') weddingId: string,
    @Query('tagIds') tagIdsQuery: string,
  ): Promise<ApiResponse<GuestListResponse>> {
    await this.requireWeddingOwner(authHeader, weddingId);

    // Parse tag IDs from query string (comma-separated)
    const tagIds = tagIdsQuery ? tagIdsQuery.split(',').filter(Boolean) : [];

    if (tagIds.length === 0) {
      // No filter, return all guests
      const guests = this.guestService.getGuestsForWedding(weddingId);
      return {
        ok: true,
        data: { guests, total: guests.length },
      };
    }

    // Validate all tags belong to this wedding
    for (const tagId of tagIds) {
      if (!this.tagService.tagBelongsToWedding(tagId, weddingId)) {
        throw new NotFoundException({
          ok: false,
          error: TAG_NOT_FOUND,
          message: `Tag ${tagId} not found`,
        });
      }
    }

    const guests = this.guestService.getGuestsByTags(weddingId, tagIds);
    return {
      ok: true,
      data: { guests, total: guests.length },
    };
  }

  /**
   * Validate auth token and verify user owns the wedding
   */
  private async requireWeddingOwner(
    authHeader: string | undefined,
    weddingId: string,
  ) {
    const user = await this.adminAuthService.requireAdmin(authHeader);

    const wedding = await this.weddingService.getWedding(weddingId);
    if (!wedding || wedding.userId !== user.id) {
      throw new NotFoundException({ ok: false, error: WEDDING_NOT_FOUND });
    }

    return { user, wedding };
  }
}
