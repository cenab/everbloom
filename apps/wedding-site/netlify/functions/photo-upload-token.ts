import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient } from './utils/supabase';
import { randomUUID } from 'crypto';

interface PhotoUploadTokenRequest {
  slug: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /photo-upload-token
 *
 * Get a signed upload URL for guest photo uploads
 * Validates wedding slug, file type, and size
 * Returns a signed URL for direct upload to Supabase Storage
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

  // Validate file size
  if (!body.fileSize || body.fileSize > MAX_FILE_SIZE) {
    return errorResponse('PHOTO_UPLOAD_VALIDATION_ERROR', 400);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(body.contentType)) {
    return errorResponse('PHOTO_UPLOAD_VALIDATION_ERROR', 400);
  }

  try {
    const supabase = getSupabaseClient();

    // Get wedding by slug
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, features, photo_moderation_config')
      .eq('slug', body.slug)
      .eq('status', 'active')
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if photo upload feature is enabled
    if (!wedding.features?.PHOTO_UPLOAD) {
      return errorResponse(ErrorCodes.FEATURE_DISABLED, 403);
    }

    // Generate unique file path
    const uploadId = randomUUID();
    const fileExtension = body.fileName.split('.').pop() || 'jpg';
    const storagePath = `${wedding.id}/${uploadId}.${fileExtension}`;

    // Create upload record
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: insertError } = await supabase
      .from('photo_uploads')
      .insert({
        id: uploadId,
        wedding_id: wedding.id,
        file_name: body.fileName,
        content_type: body.contentType,
        file_size: body.fileSize,
        storage_path: storagePath,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error creating upload record:', insertError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    // Create signed upload URL
    const { data: signedUrl, error: signedUrlError } = await supabase
      .storage
      .from('photos')
      .createSignedUploadUrl(storagePath);

    if (signedUrlError || !signedUrl) {
      console.error('Error creating signed URL:', signedUrlError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    return successResponse({
      uploadId,
      uploadUrl: signedUrl.signedUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating photo upload token:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
