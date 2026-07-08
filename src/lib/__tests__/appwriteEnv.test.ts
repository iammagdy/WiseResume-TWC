import { describe, it, expect } from 'vitest';
import { cleanViteEnv } from '../appwrite';

describe('Appwrite Environment Variables Sanitization', () => {
  describe('cleanViteEnv', () => {
    it('returns empty string for non-string inputs', () => {
      expect(cleanViteEnv(null)).toBe('');
      expect(cleanViteEnv(undefined)).toBe('');
      expect(cleanViteEnv(123)).toBe('');
      expect(cleanViteEnv({})).toBe('');
    });

    it('returns empty string for empty or whitespace strings', () => {
      expect(cleanViteEnv('')).toBe('');
      expect(cleanViteEnv('   ')).toBe('');
    });

    it('returns empty string for empty double/single quoted placeholders', () => {
      expect(cleanViteEnv('""')).toBe('');
      expect(cleanViteEnv("''")).toBe('');
      expect(cleanViteEnv(' "" ')).toBe('');
    });

    it('strips enclosing double/single quotes from non-empty values', () => {
      expect(cleanViteEnv('"my-value"')).toBe('my-value');
      expect(cleanViteEnv("'my-value'")).toBe('my-value');
      expect(cleanViteEnv('  "my-value"  ')).toBe('my-value');
    });

    it('leaves unquoted values intact', () => {
      expect(cleanViteEnv('my-value')).toBe('my-value');
      expect(cleanViteEnv('https://endpoint.io/v1')).toBe('https://endpoint.io/v1');
    });
  });
});
