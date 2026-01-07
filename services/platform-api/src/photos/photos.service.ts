import { Injectable, Logger } from '@nestjs/common';
import type { PhotoMetadata, PhotoModerationStatus, PhotoSummary } from '../types';
import { createHmac, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { MAX_PHOTO_SIZE_BYTES, PHOTO_UPLOAD_TTL_MS } from './photos.constants';

export interface UploadSession {
  id: string;
  weddingId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  expiresAt: number;
  createdAt: string;
  uploadedAt?: string;
  storagePath?: string;
  /** Whether moderation is required for this upload */
  moderationRequired?: boolean;
}

interface StoredPhoto extends PhotoMetadata {
  weddingId: string;
  storagePath: string;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly secret =
    process.env.PHOTO_UPLOAD_SECRET || 'dev-photo-upload-secret';
  private uploads = new Map<string, UploadSession>();
  private photosByWedding = new Map<string, StoredPhoto[]>();

  getMaxFileSize(): number {
    return MAX_PHOTO_SIZE_BYTES;
  }

  createUpload(
    weddingId: string,
    fileName: string,
    contentType: string,
    fileSize: number,
    moderationRequired = false,
  ): { uploadId: string; signature: string; expiresAt: number } {
    const uploadId = randomBytes(16).toString('hex');
    const expiresAt = Date.now() + PHOTO_UPLOAD_TTL_MS;
    const signature = this.signUpload(uploadId, expiresAt, contentType, fileSize);
    const createdAt = new Date().toISOString();

    this.uploads.set(uploadId, {
      id: uploadId,
      weddingId,
      fileName,
      contentType,
      fileSize,
      expiresAt,
      createdAt,
      moderationRequired,
    });

    return { uploadId, signature, expiresAt };
  }

  getUpload(uploadId: string): UploadSession | null {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * List photos for a wedding, optionally filtered by moderation status
   * @param weddingId The wedding ID
   * @param statusFilter Optional filter by moderation status
   */
  listPhotos(weddingId: string, statusFilter?: PhotoModerationStatus): PhotoMetadata[] {
    let photos = this.photosByWedding.get(weddingId) ?? [];

    if (statusFilter) {
      photos = photos.filter((p) => p.moderationStatus === statusFilter);
    }

    return [...photos]
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .map(({ storagePath, weddingId: _weddingId, ...photo }) => photo);
  }

  /**
   * Get a single photo by ID
   */
  getPhoto(weddingId: string, photoId: string): PhotoMetadata | null {
    const photos = this.photosByWedding.get(weddingId) ?? [];
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return null;
    const { storagePath: _sp, weddingId: _wid, ...result } = photo;
    return result;
  }

  /**
   * Moderate a photo (approve or reject)
   * PRD: "Admin can approve or reject guest photos"
   */
  moderatePhoto(
    weddingId: string,
    photoId: string,
    status: 'approved' | 'rejected',
  ): PhotoMetadata | null {
    const photos = this.photosByWedding.get(weddingId) ?? [];
    const photoIndex = photos.findIndex((p) => p.id === photoId);

    if (photoIndex === -1) {
      return null;
    }

    const photo = photos[photoIndex];
    photo.moderationStatus = status;
    photo.moderatedAt = new Date().toISOString();
    photos[photoIndex] = photo;
    this.photosByWedding.set(weddingId, photos);

    this.logger.log(`Photo ${photoId} moderated to ${status} for wedding ${weddingId}`);

    const { storagePath: _sp, weddingId: _wid, ...result } = photo;
    return result;
  }

  /**
   * Remove a photo (for admin to remove previously approved photos)
   * PRD: "Admin can remove previously approved photos"
   */
  removePhoto(weddingId: string, photoId: string): boolean {
    const photos = this.photosByWedding.get(weddingId) ?? [];
    const photoIndex = photos.findIndex((p) => p.id === photoId);

    if (photoIndex === -1) {
      return false;
    }

    // Remove the photo from the list
    photos.splice(photoIndex, 1);
    this.photosByWedding.set(weddingId, photos);

    this.logger.log(`Photo ${photoId} removed from wedding ${weddingId}`);
    return true;
  }

  /**
   * Get photo upload summary statistics for dashboard
   * PRD: "Dashboard shows photo upload count"
   */
  getPhotoSummary(weddingId: string): PhotoSummary {
    const photos = this.photosByWedding.get(weddingId) ?? [];

    // Sort by most recent first
    const sortedPhotos = [...photos].sort((a, b) =>
      b.uploadedAt.localeCompare(a.uploadedAt),
    );

    // Calculate total size
    const totalSizeBytes = photos.reduce((sum, photo) => sum + photo.fileSize, 0);

    // Get recent uploads (last 5) - map to PhotoMetadata without internal fields
    const recentUploads = sortedPhotos.slice(0, 5).map(
      ({ storagePath: _sp, weddingId: _wid, ...photo }) => photo,
    );

    // Count by moderation status
    const pendingModerationCount = photos.filter(
      (p) => p.moderationStatus === 'pending',
    ).length;
    const approvedCount = photos.filter((p) => p.moderationStatus === 'approved').length;
    const rejectedCount = photos.filter((p) => p.moderationStatus === 'rejected').length;

    return {
      totalPhotos: photos.length,
      totalSizeBytes,
      lastUploadedAt: sortedPhotos[0]?.uploadedAt,
      recentUploads,
      pendingModerationCount,
      approvedCount,
      rejectedCount,
    };
  }

  isUploadExpired(upload: UploadSession): boolean {
    return Date.now() > upload.expiresAt;
  }

  verifySignature(
    uploadId: string,
    expiresAt: number,
    contentType: string,
    fileSize: number,
    signature: string,
  ): boolean {
    const expected = this.signUpload(uploadId, expiresAt, contentType, fileSize);
    return expected === signature;
  }

  async storeUpload(
    upload: UploadSession,
    file: { originalname: string; buffer?: Buffer; path?: string },
  ): Promise<void> {
    const baseDir =
      process.env.PHOTO_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
    const safeName = this.sanitizeFileName(file.originalname || upload.fileName);
    const weddingDir = path.join(baseDir, upload.weddingId);

    await fs.mkdir(weddingDir, { recursive: true });

    const filePath = path.join(weddingDir, `${upload.id}-${safeName}`);
    const buffer = file.buffer ?? (file.path ? await fs.readFile(file.path) : null);

    if (!buffer) {
      throw new Error('Photo upload payload is empty');
    }

    await fs.writeFile(filePath, buffer);

    const uploadedAt = new Date().toISOString();
    upload.storagePath = filePath;
    upload.uploadedAt = uploadedAt;
    this.uploads.set(upload.id, upload);

    // Set moderation status based on whether moderation is required
    // If moderation is required, photos go to 'pending'; otherwise 'approved'
    const moderationStatus: PhotoModerationStatus = upload.moderationRequired
      ? 'pending'
      : 'approved';

    this.addPhotoRecord({
      id: upload.id,
      weddingId: upload.weddingId,
      fileName: file.originalname || upload.fileName,
      contentType: upload.contentType,
      fileSize: buffer.length,
      uploadedAt,
      storagePath: filePath,
      moderationStatus,
    });

    this.logger.log(`Stored photo upload ${upload.id} to ${filePath}`);
  }

  private signUpload(
    uploadId: string,
    expiresAt: number,
    contentType: string,
    fileSize: number,
  ): string {
    return createHmac('sha256', this.secret)
      .update(`${uploadId}.${expiresAt}.${contentType}.${fileSize}`)
      .digest('hex');
  }

  private sanitizeFileName(fileName: string): string {
    const trimmed = fileName.trim().toLowerCase();
    const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '-');
    return sanitized || 'upload';
  }

  private addPhotoRecord(record: StoredPhoto): void {
    const current = this.photosByWedding.get(record.weddingId) ?? [];
    this.photosByWedding.set(record.weddingId, [record, ...current]);
  }
}
