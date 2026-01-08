import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient } from './utils/supabase';

interface PhotoMetadataRequest {
  uploadId: string;
  uploaderName?: string;
  uploaderEmail?: string;
}

/**
 * POST /photo-metadata
 *
 * Complete a photo upload by providing metadata
 * Moves from pending upload to permanent photo record
 * Optionally applies auto-approval based on wedding settings
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
    const supabase = getSupabaseClient();

    // Get the pending upload record
    const { data: upload, error: uploadError } = await supabase
      .from('photo_uploads')
      .select('*')
      .eq('id', body.uploadId)
      .single();

    if (uploadError || !upload) {
      return errorResponse('PHOTO_UPLOAD_INVALID', 404);
    }

    // Check if upload has expired
    if (new Date(upload.expires_at) < new Date()) {
      return errorResponse('PHOTO_UPLOAD_INVALID', 400);
    }

    // Check if already completed
    if (upload.completed_at) {
      return errorResponse('PHOTO_UPLOAD_INVALID', 400);
    }

    // Get wedding to check moderation settings
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('photo_moderation_config')
      .eq('id', upload.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Determine moderation status based on settings
    const moderationRequired = wedding.photo_moderation_config?.moderationRequired ?? false;
    const moderationStatus = moderationRequired ? 'pending' : 'approved';

    // Create photo record
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .insert({
        wedding_id: upload.wedding_id,
        file_name: upload.file_name,
        content_type: upload.content_type,
        file_size: upload.file_size,
        storage_path: upload.storage_path,
        moderation_status: moderationStatus,
        moderated_at: moderationRequired ? null : new Date().toISOString(),
        uploader_name: body.uploaderName || null,
        uploader_email: body.uploaderEmail || null,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (photoError) {
      console.error('Error creating photo record:', photoError);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
    }

    // Mark upload as completed
    await supabase
      .from('photo_uploads')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', body.uploadId);

    return successResponse({
      id: photo.id,
      fileName: photo.file_name,
      moderationStatus: photo.moderation_status,
      uploadedAt: photo.uploaded_at,
    });
  } catch (error) {
    console.error('Error completing photo upload:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
