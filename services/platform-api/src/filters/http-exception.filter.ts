import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiError,
  VALIDATION_ERROR,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  INTERNAL_ERROR,
} from '../types';

/**
 * Global exception filter that normalizes all errors to the structured API format.
 *
 * All responses follow: { ok: false, error: 'ERROR_CODE' }
 *
 * This ensures:
 * - Consistent error response format across all endpoints
 * - No stack traces or internal details exposed
 * - Error codes are documented and predictable
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let errorResponse: ApiError;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Check if the response is already in our structured format
      if (this.isStructuredError(exceptionResponse)) {
        errorResponse = exceptionResponse as ApiError;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // NestJS default exception response format
        const nestResponse = exceptionResponse as Record<string, unknown>;

        // Check if it has our error format with 'error' field
        if (nestResponse.error && typeof nestResponse.error === 'string' && nestResponse.ok === false) {
          errorResponse = { ok: false, error: nestResponse.error };
        } else {
          // Map HTTP status to error code
          errorResponse = {
            ok: false,
            error: this.mapStatusToErrorCode(status),
          };
        }
      } else if (typeof exceptionResponse === 'string') {
        // Plain string error message - map to error code
        errorResponse = {
          ok: false,
          error: this.mapStatusToErrorCode(status),
        };
      } else {
        errorResponse = {
          ok: false,
          error: this.mapStatusToErrorCode(status),
        };
      }
    } else {
      // Unexpected error - log it but don't expose details
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = { ok: false, error: INTERNAL_ERROR };

      // Log the actual error for debugging (server-side only)
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Always return the structured response
    response.status(status).json(errorResponse);
  }

  /**
   * Check if the response is already in our structured ApiError format
   */
  private isStructuredError(response: unknown): response is ApiError {
    return (
      typeof response === 'object' &&
      response !== null &&
      'ok' in response &&
      (response as Record<string, unknown>).ok === false &&
      'error' in response &&
      typeof (response as Record<string, unknown>).error === 'string'
    );
  }

  /**
   * Map HTTP status codes to standardized error codes
   */
  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return NOT_FOUND;
      case HttpStatus.CONFLICT:
        return VALIDATION_ERROR;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return VALIDATION_ERROR;
      default:
        return INTERNAL_ERROR;
    }
  }
}
