import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { GuestTag, CreateTagRequest, UpdateTagRequest } from '../types';

/**
 * Default tag colors - curated palette that aligns with design system
 */
const DEFAULT_TAG_COLORS = [
  '#8fac8b', // sage (accent)
  '#c9826b', // terracotta (primary)
  '#7c9eb2', // dusty blue
  '#b8a9c9', // lavender
  '#d4a574', // warm tan
  '#9cb8a8', // seafoam
];

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  // In-memory store for development
  private tags: Map<string, GuestTag> = new Map();

  /**
   * Get a color from the curated palette
   */
  private getDefaultColor(index: number): string {
    return DEFAULT_TAG_COLORS[index % DEFAULT_TAG_COLORS.length];
  }

  /**
   * Create a new tag for a wedding
   */
  async createTag(
    weddingId: string,
    request: CreateTagRequest,
  ): Promise<GuestTag> {
    // Check for duplicate name in same wedding
    const existing = this.findByName(weddingId, request.name);
    if (existing) {
      throw new Error('TAG_ALREADY_EXISTS');
    }

    const tagId = randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    // Get count of existing tags for this wedding to assign a color
    const existingTags = this.getTagsForWedding(weddingId);
    const color = request.color || this.getDefaultColor(existingTags.length);

    const tag: GuestTag = {
      id: tagId,
      weddingId,
      name: request.name.trim(),
      color,
      createdAt: now,
    };

    this.tags.set(tagId, tag);
    this.logger.log(`Created tag ${tagId} for wedding ${weddingId}: ${tag.name}`);

    return tag;
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    tagId: string,
    request: UpdateTagRequest,
  ): Promise<GuestTag | null> {
    const tag = this.tags.get(tagId);
    if (!tag) {
      return null;
    }

    // Check for duplicate name if name is being changed
    if (request.name && request.name !== tag.name) {
      const existing = this.findByName(tag.weddingId, request.name);
      if (existing && existing.id !== tagId) {
        throw new Error('TAG_ALREADY_EXISTS');
      }
    }

    const updated: GuestTag = {
      ...tag,
      name: request.name?.trim() ?? tag.name,
      color: request.color ?? tag.color,
    };

    this.tags.set(tagId, updated);
    this.logger.log(`Updated tag ${tagId}`);

    return updated;
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string): Promise<boolean> {
    const tag = this.tags.get(tagId);
    if (!tag) {
      return false;
    }

    this.tags.delete(tagId);
    this.logger.log(`Deleted tag ${tagId}`);

    return true;
  }

  /**
   * Get a tag by ID
   */
  getTag(tagId: string): GuestTag | null {
    return this.tags.get(tagId) || null;
  }

  /**
   * Get all tags for a wedding
   */
  getTagsForWedding(weddingId: string): GuestTag[] {
    const weddingTags: GuestTag[] = [];
    for (const tag of this.tags.values()) {
      if (tag.weddingId === weddingId) {
        weddingTags.push(tag);
      }
    }
    // Sort by creation date (oldest first)
    return weddingTags.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  /**
   * Find a tag by name in a wedding
   */
  findByName(weddingId: string, name: string): GuestTag | null {
    const normalizedName = name.toLowerCase().trim();
    for (const tag of this.tags.values()) {
      if (
        tag.weddingId === weddingId &&
        tag.name.toLowerCase() === normalizedName
      ) {
        return tag;
      }
    }
    return null;
  }

  /**
   * Check if a tag exists and belongs to a wedding
   */
  tagBelongsToWedding(tagId: string, weddingId: string): boolean {
    const tag = this.tags.get(tagId);
    return tag !== null && tag !== undefined && tag.weddingId === weddingId;
  }
}
