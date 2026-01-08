import { generateVerificationToken } from './dns-verification';

describe('DNS Verification Utilities', () => {
  describe('generateVerificationToken', () => {
    it('should generate a deterministic token for same inputs', () => {
      const weddingId = 'wedding-123';
      const domain = 'example.com';

      const token1 = generateVerificationToken(weddingId, domain);
      const token2 = generateVerificationToken(weddingId, domain);

      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different wedding IDs', () => {
      const domain = 'example.com';

      const token1 = generateVerificationToken('wedding-1', domain);
      const token2 = generateVerificationToken('wedding-2', domain);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different domains', () => {
      const weddingId = 'wedding-123';

      const token1 = generateVerificationToken(weddingId, 'example.com');
      const token2 = generateVerificationToken(weddingId, 'other.com');

      expect(token1).not.toBe(token2);
    });

    it('should generate a 32-character token', () => {
      const token = generateVerificationToken('wedding-1', 'example.com');

      expect(token.length).toBe(32);
    });

    it('should only contain hex characters', () => {
      const token = generateVerificationToken('wedding-1', 'example.com');

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});
