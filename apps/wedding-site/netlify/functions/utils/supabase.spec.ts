import { describe, it, expect } from 'vitest';
import { hashToken, compareHashesConstantTime } from './supabase';

describe('Supabase Utilities', () => {
  describe('hashToken', () => {
    it('should generate consistent hash for same token', () => {
      const token = 'test-token-123';

      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string (SHA-256)', () => {
      const hash = hashToken('any-token');

      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('compareHashesConstantTime', () => {
    it('should return true for matching hashes', () => {
      const token = 'test-token';
      const hash = hashToken(token);

      const result = compareHashesConstantTime(hash, hash);

      expect(result).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');

      const result = compareHashesConstantTime(hash1, hash2);

      expect(result).toBe(false);
    });

    it('should return false for different length hashes', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc123def456';

      const result = compareHashesConstantTime(hash1, hash2);

      expect(result).toBe(false);
    });

    it('should return false for invalid hex strings', () => {
      const result = compareHashesConstantTime('invalid', 'also-invalid');

      expect(result).toBe(false);
    });
  });
});
