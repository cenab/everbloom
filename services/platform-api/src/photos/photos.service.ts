import { Injectable, Logger } from '@nestjs/common';
import type { PhotoMetadata, PhotoSummary } from '../types';
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
    });

    return { uploadId, signature, expiresAt };
  }

  getUpload(uploadId: string): UploadSession | null {
    return this.uploads.get(uploadId) || null;
  }

  listPhotos(weddingId: string): PhotoMetadata[] {
    const photos = this.photosByWedding.get(weddingId) ?? [];
    return [...photos]
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .map(({ storagePath, weddingId: _weddingId, ...photo }) => photo);
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

    return {
      totalPhotos: photos.length,
      totalSizeBytes,
      lastUploadedAt: sortedPhotos[0]?.uploadedAt,
      recentUploads,
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

    this.addPhotoRecord({
      id: upload.id,
      weddingId: upload.weddingId,
      fileName: file.originalname || upload.fileName,
      contentType: upload.contentType,
      fileSize: buffer.length,
      uploadedAt,
      storagePath: filePath,
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
