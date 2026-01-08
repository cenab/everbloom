import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { getSupabaseClient } from './utils/supabase';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

interface PasscodeVerifyRequest {
  slug: string;
  passcode: string;
}

/**
 * POST /passcode-verify
 *
 * Verify a site passcode for protected wedding sites
 * Returns a session token if the passcode is correct
 * Uses bcrypt for secure passcode comparison
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
  const body = await parseJsonBody<PasscodeVerifyRequest>(request);

  if (!body || !body.slug || !body.passcode) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    const supabase = getSupabaseClient();

    // Get wedding by slug
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, passcode_config, features')
      .eq('slug', body.slug)
      .eq('status', 'active')
      .single();

    if (weddingError || !wedding) {
      return errorResponse(ErrorCodes.WEDDING_NOT_FOUND, 404);
    }

    // Check if passcode protection is enabled
    if (!wedding.features?.PASSCODE_SITE || !wedding.passcode_config?.enabled) {
      return errorResponse('PASSCODE_NOT_CONFIGURED', 400);
    }

    // Check if passcode hash exists
    const passcodeHash = wedding.passcode_config?.passcodeHash;
    if (!passcodeHash) {
      return errorResponse('PASSCODE_NOT_CONFIGURED', 400);
    }

    // Verify passcode using bcrypt
    const isValid = await bcrypt.compare(body.passcode, passcodeHash);

    if (!isValid) {
      return errorResponse(ErrorCodes.INVALID_PASSCODE, 401);
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');

    // In production, you might want to store this session token
    // For now, we return it for client-side storage

    return successResponse({
      valid: true,
      sessionToken,
    });
  } catch (error) {
    console.error('Error verifying passcode:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
