import { describe, it, expect } from 'vitest';
import {
  jsonResponse,
  successResponse,
  errorResponse,
  handleCors,
  parseJsonBody,
  getQueryParam,
  ErrorCodes,
} from './response';

describe('Response Utilities', () => {
  describe('jsonResponse', () => {
    it('should create a JSON response with correct headers', () => {
      const data = { test: 'value' };
      const response = jsonResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should use custom status code', () => {
      const response = jsonResponse({ error: 'Not Found' }, 404);

      expect(response.status).toBe(404);
    });
  });

  describe('successResponse', () => {
    it('should create a success response with ok: true', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);

      const body = await response.json();

      expect(body.ok).toBe(true);
      expect(body.data).toEqual(data);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with ok: false', async () => {
      const response = errorResponse('VALIDATION_ERROR', 400);

      const body = await response.json();

      expect(body.ok).toBe(false);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should default to 400 status', async () => {
      const response = errorResponse('SOME_ERROR');

      expect(response.status).toBe(400);
    });
  });

  describe('handleCors', () => {
    it('should return null for non-OPTIONS requests', () => {
      const request = new Request('http://example.com', { method: 'GET' });
      const result = handleCors(request);

      expect(result).toBeNull();
    });

    it('should return CORS response for OPTIONS requests', () => {
      const request = new Request('http://example.com', { method: 'OPTIONS' });
      const result = handleCors(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(204);
      expect(result?.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(result?.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(result?.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('parseJsonBody', () => {
    it('should parse valid JSON body', async () => {
      const data = { name: 'Test', value: 123 };
      const request = new Request('http://example.com', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);

      expect(result).toEqual(data);
    });

    it('should return null for invalid JSON', async () => {
      const request = new Request('http://example.com', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody(request);

      expect(result).toBeNull();
    });
  });

  describe('getQueryParam', () => {
    it('should get query parameter from URL', () => {
      const request = new Request('http://example.com?slug=test-wedding&token=abc');

      const slug = getQueryParam(request, 'slug');
      const token = getQueryParam(request, 'token');

      expect(slug).toBe('test-wedding');
      expect(token).toBe('abc');
    });

    it('should return null for missing parameter', () => {
      const request = new Request('http://example.com?slug=test');

      const result = getQueryParam(request, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.FEATURE_DISABLED).toBe('FEATURE_DISABLED');
      expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.WEDDING_NOT_FOUND).toBe('WEDDING_NOT_FOUND');
    });
  });
});
