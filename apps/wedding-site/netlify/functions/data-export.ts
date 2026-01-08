import type { Context } from '@netlify/functions';
import {
  handleCors,
  parseJsonBody,
  successResponse,
  errorResponse,
  ErrorCodes,
} from './utils/response';
import { apiPost, getStatusFromResponse } from './utils/platform-api';

interface DataExportRequest {
  token: string;
}

/**
 * POST /data-export
 *
 * Export personal data for a guest (GDPR compliance)
 * Guest identifies themselves via their RSVP token
 * Returns all data associated with the guest
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
  const body = await parseJsonBody<DataExportRequest>(request);

  if (!body || !body.token) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 400);
  }

  try {
    // Call Platform API for data export
    const response = await apiPost('/rsvp/data-export', { token: body.token });

    if (!response.ok) {
      const status = getStatusFromResponse(response);
      return errorResponse(response.error || ErrorCodes.INTERNAL_ERROR, status);
    }

    return successResponse(response.data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 500);
  }
}
