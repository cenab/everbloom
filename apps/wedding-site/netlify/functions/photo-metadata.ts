import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface PhotoMetadataRequest {
  uploadId: string;
  uploaderName?: string;
  uploaderEmail?: string;
}

interface PhotoMetadataResponse {
  id: string;
  fileName: string;
  moderationStatus: string;
  uploadedAt: string;
}

/**
 * POST /photo-metadata
 *
 * Complete a photo upload by providing metadata.
 * Proxies to Platform API which handles validation and photo record finalization.
 *
 * Note: In the Platform API architecture, the photo record is created when the file
 * is uploaded via the signed URL. This endpoint confirms the upload completed
 * and allows optional uploader metadata to be associated with the photo.
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
  const body = await parseJsonBody<PhotoMetadataRequest>(request);

  if (!body || !body.uploadId) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    // Call Platform API to complete photo metadata
    const response = await apiPost<PhotoMetadataResponse>('/photos/complete', {
      uploadId: body.uploadId,
      uploaderName: body.uploaderName,
      uploaderEmail: body.uploaderEmail,
    });

    if (!response.ok || !response.data) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse({
      id: response.data.id,
      fileName: response.data.fileName,
      moderationStatus: response.data.moderationStatus,
      uploadedAt: response.data.uploadedAt,
    });
  } catch (error) {
    console.error('Error completing photo upload:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
