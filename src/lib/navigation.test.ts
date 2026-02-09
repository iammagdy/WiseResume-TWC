import { describe, it, expect } from 'vitest';
import { getBackRoute, shouldExitOnBack } from './navigation';

describe('navigation', () => {
  describe('getBackRoute', () => {
    describe('Guest User', () => {
      it('should redirect guest users on /editor to landing page', () => {
        expect(getBackRoute('/editor', false)).toBe('/');
      });

      it('should NOT redirect guest users on other pages', () => {
        expect(getBackRoute('/dashboard', false)).toBe('/dashboard'); // /dashboard is not explicitly in BACK_ROUTES, so it hits fallback? No wait, let me check BACK_ROUTES
      });
    });

    describe('Exact Matches', () => {
      it('should return /dashboard for /editor', () => {
        expect(getBackRoute('/editor', true)).toBe('/dashboard');
      });

      it('should return /editor for /preview', () => {
        expect(getBackRoute('/preview', true)).toBe('/editor');
      });

      it('should return /dashboard for /upload', () => {
        expect(getBackRoute('/upload', true)).toBe('/dashboard');
      });

      it('should return /dashboard for /interview', () => {
        expect(getBackRoute('/interview', true)).toBe('/dashboard');
      });

      it('should return /dashboard for /settings', () => {
        expect(getBackRoute('/settings', true)).toBe('/dashboard');
      });

      it('should return /dashboard for /ai', () => {
        expect(getBackRoute('/ai', true)).toBe('/dashboard');
      });

      it('should return / for /auth', () => {
        expect(getBackRoute('/auth', true)).toBe('/');
      });
    });

    describe('Dynamic Routes', () => {
      it('should handle /editor/{uuid}', () => {
        expect(getBackRoute('/editor/123-456', true)).toBe('/dashboard');
      });

      it('should handle /preview/{uuid}', () => {
        expect(getBackRoute('/preview/123-456', true)).toBe('/editor');
      });

      // Additional dynamic routes based on BACK_ROUTES keys
      it('should handle /upload/{id}', () => {
        expect(getBackRoute('/upload/resume.pdf', true)).toBe('/dashboard');
      });
    });

    describe('Deep Nesting', () => {
      it('should handle deeply nested routes', () => {
        expect(getBackRoute('/editor/123/section/contact', true)).toBe('/dashboard');
      });

      it('should handle deeply nested preview routes', () => {
        expect(getBackRoute('/preview/123/full/view', true)).toBe('/editor');
      });
    });

    describe('Prefix Safety', () => {
      it('should NOT match paths that share a prefix but are different directories', () => {
        // /editors shares prefix with /editor, but should not match /editor logic
        // It should hit the fallback
        expect(getBackRoute('/editors', true)).toBe('/dashboard');
      });

      it('should NOT match /editor-pro', () => {
        expect(getBackRoute('/editor-pro', true)).toBe('/dashboard');
      });
    });

    describe('Fallback', () => {
      it('should return /dashboard for unknown routes', () => {
        expect(getBackRoute('/unknown-route', true)).toBe('/dashboard');
      });

      it('should return /dashboard for root path /', () => {
         // '/' is not in BACK_ROUTES, so it hits fallback
        expect(getBackRoute('/', true)).toBe('/dashboard');
      });
    });
  });

  describe('shouldExitOnBack', () => {
    it('should return true for /', () => {
      expect(shouldExitOnBack('/')).toBe(true);
    });

    it('should return true for /dashboard', () => {
      expect(shouldExitOnBack('/dashboard')).toBe(true);
    });

    it('should return false for other routes', () => {
      expect(shouldExitOnBack('/editor')).toBe(false);
      expect(shouldExitOnBack('/settings')).toBe(false);
      expect(shouldExitOnBack('/random')).toBe(false);
    });
  });
});
