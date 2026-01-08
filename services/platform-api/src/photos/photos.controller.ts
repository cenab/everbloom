import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type {
  ApiResponse,
  PhotoUploadUrlRequest,
  PhotoUploadUrlResponse,
  PhotoUploadResponse,
  PhotoMetadata,
} from '../types';
import {
  FEATURE_DISABLED,
  WEDDING_NOT_FOUND,
  PHOTO_UPLOAD_INVALID,
  PHOTO_UPLOAD_VALIDATION_ERROR,
  VALIDATION_ERROR,
} from '../types';
import { WeddingService } from '../wedding/wedding.service';
import { PhotosService } from './photos.service';
import { MAX_PHOTO_SIZE_BYTES } from './photos.constants';

/**
 * Public controller for guest photo uploads
 * Uses signed URLs to allow direct uploads
 *
 * PRD: "Rate limits prevent abuse" - Upload endpoints have strict limits
 */
@Controller('photos')
export class PhotosController {
  constructor(
    private readonly weddingService: WeddingService,
    private readonly photosService: PhotosService,
  ) {}

  /**
   * Create a signed URL for photo upload
   * POST /api/photos/upload-url
   *
   * PRD: "Rate limits prevent abuse" - Strict limit: 30 requests per minute (batch uploads)
   */
  @Throttle({ strict: { ttl: 60000, limit: 30 } })
  @Post('upload-url')
  async createUploadUrl(
    @Body() body: PhotoUploadUrlRequest,
    @Req() req: Request,
  ): Promise<ApiResponse<PhotoUploadUrlResponse>> {
    const { slug, fileName, contentType, fileSize } = body || {};

    const normalizedSize = Number(fileSize);

    if (!slug || !fileName || !contentType || !normalizedSize) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    if (normalizedSize <= 0 || normalizedSize > MAX_PHOTO_SIZE_BYTES) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    const wedding = await this.weddingService.getWeddingBySlug(slug);

    if (!wedding || wedding.status !== 'active') {
      throw new NotFoundException({
        ok: false,
        error: WEDDING_NOT_FOUND,
      });
    }

    if (!wedding.features.PHOTO_UPLOAD) {
      throw new ForbiddenException({
        ok: false,
        error: FEATURE_DISABLED,
      });
    }

    // Check if moderation is required for this wedding
    const moderationRequired = await this.weddingService.isPhotoModerationRequired(wedding.id);

    const { uploadId, signature, expiresAt } = this.photosService.createUpload(
      wedding.id,
      fileName,
      contentType,
      normalizedSize,
      moderationRequired,
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadUrl = `${baseUrl}/api/photos/upload/${uploadId}?signature=${signature}&expires=${expiresAt}`;

    return {
      ok: true,
      data: {
        uploadId,
        uploadUrl,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    };
  }

  /**
   * Upload a photo using a signed URL
   * POST /api/photos/upload/:uploadId?signature=...&expires=...
   *
   * PRD: "Rate limits prevent abuse" - Strict limit: 30 requests per minute (batch uploads)
   */
  @Throttle({ strict: { ttl: 60000, limit: 30 } })
  @Post('upload/:uploadId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
    }),
  )
  async uploadPhoto(
    @Param('uploadId') uploadId: string,
    @Query('signature') signature: string,
    @Query('expires') expires: string,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer?: Buffer;
      path?: string;
    },
  ): Promise<ApiResponse<PhotoUploadResponse>> {
    if (!uploadId || !signature || !expires) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    const expiresAt = Number(expires);
    if (!Number.isFinite(expiresAt)) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    const upload = this.photosService.getUpload(uploadId);

    if (!upload) {
      throw new ForbiddenException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    if (upload.expiresAt !== expiresAt || this.photosService.isUploadExpired(upload)) {
      throw new ForbiddenException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    if (upload.uploadedAt) {
      throw new ForbiddenException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    const signatureValid = this.photosService.verifySignature(
      uploadId,
      upload.expiresAt,
      upload.contentType,
      upload.fileSize,
      signature,
    );

    if (!signatureValid) {
      throw new ForbiddenException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    if (!file || (!file.buffer && !file.path)) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    if (file.size <= 0 || file.size > upload.fileSize) {
      throw new BadRequestException({
        ok: false,
        error: PHOTO_UPLOAD_VALIDATION_ERROR,
      });
    }

    await this.photosService.storeUpload(upload, file);

    return { ok: true, data: { uploadId } };
  }

  /**
   * Complete a photo upload and retrieve the photo metadata
   * POST /api/photos/complete
   *
   * This endpoint is called after the file has been uploaded to confirm
   * the upload completed successfully and retrieve the photo record details.
   *
   * PRD: "Rate limits prevent abuse" - Strict limit: 30 requests per minute
   */
  @Throttle({ strict: { ttl: 60000, limit: 30 } })
  @Post('complete')
  async completeUpload(
    @Body() body: { uploadId: string; uploaderName?: string; uploaderEmail?: string },
  ): Promise<ApiResponse<PhotoMetadata>> {
    const { uploadId } = body || {};

    if (!uploadId) {
      throw new BadRequestException({
        ok: false,
        error: VALIDATION_ERROR,
      });
    }

    const photo = this.photosService.completeUpload(uploadId);

    if (!photo) {
      throw new NotFoundException({
        ok: false,
        error: PHOTO_UPLOAD_INVALID,
      });
    }

    return { ok: true, data: photo };
  }
}
