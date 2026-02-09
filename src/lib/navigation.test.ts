import { describe, it, expect } from 'vitest';
import { getBackRoute, shouldExitOnBack } from './navigation';

describe('navigation', () => {
  describe('shouldExitOnBack', () => {
    it('returns true for root path', () => {
      expect(shouldExitOnBack('/')).toBe(true);
    });

    it('returns true for dashboard path', () => {
      expect(shouldExitOnBack('/dashboard')).toBe(true);
    });

    it('returns true for dashboard path with trailing slash', () => {
      expect(shouldExitOnBack('/dashboard/')).toBe(true);
    });

    it('returns false for other paths', () => {
      expect(shouldExitOnBack('/settings')).toBe(false);
      expect(shouldExitOnBack('/editor')).toBe(false);
    });
  });

  describe('getBackRoute', () => {
    it('returns /dashboard for exact match /settings', () => {
      expect(getBackRoute('/settings')).toBe('/dashboard');
    });

    it('returns /dashboard for exact match /ai', () => {
      expect(getBackRoute('/ai')).toBe('/dashboard');
    });

    it('returns / for exact match /auth', () => {
      expect(getBackRoute('/auth')).toBe('/');
    });

    it('returns /editor for /preview', () => {
      expect(getBackRoute('/preview')).toBe('/editor');
    });

    it('handles dynamic routes correctly (e.g., /editor/123 -> /dashboard)', () => {
      expect(getBackRoute('/editor/123')).toBe('/dashboard');
    });

    it('returns / (Landing Page) for unauthenticated guest on /editor', () => {
      expect(getBackRoute('/editor', false)).toBe('/');
    });

    it('returns /dashboard for authenticated user on /editor', () => {
      expect(getBackRoute('/editor', true)).toBe('/dashboard');
    });

    it('returns default fallback /dashboard for unknown routes', () => {
      expect(getBackRoute('/unknown/route')).toBe('/dashboard');
    });
  });
});
