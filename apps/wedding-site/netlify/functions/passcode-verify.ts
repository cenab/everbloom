import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface PasscodeVerifyRequest {
  slug: string;
  passcode: string;
}

interface VerifyPasscodeResponse {
  valid: boolean;
  sessionToken: string;
}

/**
 * POST /passcode-verify
 *
 * Verify a site passcode for protected wedding sites
 * Returns a session token if the passcode is correct
 * Delegates verification to the Platform API
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
    // Call Platform API to verify passcode
    const response = await apiPost<VerifyPasscodeResponse>(
      `/site-config/${body.slug}/verify-passcode`,
      { passcode: body.passcode },
    );

    if (!response.ok) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse({
      valid: response.data?.valid ?? true,
      sessionToken: response.data?.sessionToken,
    });
  } catch (error) {
    console.error('Error verifying passcode:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
