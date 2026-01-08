import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface PhotoUploadTokenRequest {
  slug: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

interface PhotoUploadUrlResponse {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
}

/**
 * POST /photo-upload-token
 *
 * Get a signed upload URL for guest photo uploads
 * Proxies to Platform API which handles validation, feature checks,
 * record creation, and signed URL generation
 */
export default async function handler(request: Request, _context: Context): Promise<Response> {
  // Handle CORS
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Parse request body
  const body = await parseJsonBody<PhotoUploadTokenRequest>(request);

  if (!body || !body.slug || !body.fileName || !body.contentType) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  // Basic validation before calling Platform API
  if (!body.fileSize) {
    return errorResponse('PHOTO_UPLOAD_VALIDATION_ERROR', 400);
  }

  try {
    // Call Platform API to get upload URL
    const response = await apiPost<PhotoUploadUrlResponse>('/photos/upload-url', {
      slug: body.slug,
      fileName: body.fileName,
      contentType: body.contentType,
      fileSize: body.fileSize,
    });

    if (!response.ok || !response.data) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse({
      uploadId: response.data.uploadId,
      uploadUrl: response.data.uploadUrl,
      expiresAt: response.data.expiresAt,
    });
  } catch (error) {
    console.error('Error creating photo upload token:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
