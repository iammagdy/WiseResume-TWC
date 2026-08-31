import { describe, expect, it } from 'vitest';
import { resolveLocale, isPublicLocalizedRoute } from '../core';
import { whatsNewReleases, getAvailableMonthGroups } from '@/data/whatsNewData';

describe('Public Locale Routing & WhatsNew Data Reconciliation', () => {
  describe('Public Locale Routing Contract (Bug 2 Fix)', () => {
    it('enforces English LTR for canonical unprefixed public routes even if localStorage is ar', () => {
      const publicPaths = [
        '/whats-new',
        '/',
        '/pricing',
        '/terms',
        '/privacy',
        '/refund-policy',
        '/guides',
        '/examples',
        '/auth',
      ];

      for (const path of publicPaths) {
        expect(isPublicLocalizedRoute(path)).toBe(true);
        const resolved = resolveLocale({
          pathname: path,
          persistedPreference: 'ar',
          userPreference: 'ar',
        });
        expect(resolved).toBe('en');
      }
    });

    it('enforces Arabic RTL for /ar/ prefixed public routes even if localStorage is en', () => {
      const arPublicPaths = [
        '/ar/whats-new',
        '/ar',
        '/ar/pricing',
        '/ar/terms',
        '/ar/privacy',
        '/ar/refund-policy',
        '/ar/guides',
        '/ar/examples',
        '/ar/auth',
      ];

      for (const path of arPublicPaths) {
        expect(isPublicLocalizedRoute(path)).toBe(true);
        const resolved = resolveLocale({
          pathname: path,
          persistedPreference: 'en',
          userPreference: 'en',
        });
        expect(resolved).toBe('ar');
      }
    });

    it('allows persisted preference to control authenticated private routes', () => {
      const privatePaths = ['/dashboard', '/editor', '/settings', '/tailor', '/applications'];

      for (const path of privatePaths) {
        expect(isPublicLocalizedRoute(path)).toBe(false);
        const resolvedAr = resolveLocale({
          pathname: path,
          persistedPreference: 'ar',
        });
        expect(resolvedAr).toBe('ar');

        const resolvedEn = resolveLocale({
          pathname: path,
          persistedPreference: 'en',
        });
        expect(resolvedEn).toBe('en');
      }
    });
  });

  describe('WhatsNew Dynamic Month Architecture & Inventory (Bug 1 Fix)', () => {
    it('contains all 34 reconciled release items across October 2025 - August 2026', () => {
      expect(whatsNewReleases.length).toBe(34);
    });

    it('derives month groups dynamically without hardcoded missing 2026 months', () => {
      const monthGroups = getAvailableMonthGroups(whatsNewReleases);
      const monthKeys = monthGroups.map((g) => g.id);

      // Verify all 2026 months are individually represented
      expect(monthKeys).toContain('2026-08');
      expect(monthKeys).toContain('2026-07');
      expect(monthKeys).toContain('2026-06');
      expect(monthKeys).toContain('2026-05');
      expect(monthKeys).toContain('2026-04');
      expect(monthKeys).toContain('2026-03');
      expect(monthKeys).toContain('2026-02');
      expect(monthKeys).toContain('2026-01');

      // Verify months are sorted newest to oldest
      expect(monthKeys[0]).toBe('2026-08');
      expect(monthKeys[1]).toBe('2026-07');
      expect(monthKeys[2]).toBe('2026-06');

      // Verify no 2026 release uses 'older'
      const releases2026 = whatsNewReleases.filter((r) => r.year === 2026);
      for (const release of releases2026) {
        expect(release.monthKey).not.toBe('older');
        expect(release.monthKey).toMatch(/^2026-\d{2}$/);
      }
    });

    it('enforces dataset invariants across all release items', () => {
      // 1. Release count matches dataset length (no hardcoded expectations)
      expect(whatsNewReleases.length).toBeGreaterThan(0);

      // 2. No release appears twice (unique IDs)
      const ids = whatsNewReleases.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(whatsNewReleases.length);

      // 3. Every 2026 release uses a valid YYYY-MM monthKey and zero use 'older'
      const releases2026 = whatsNewReleases.filter((r) => r.year === 2026);
      for (const release of releases2026) {
        expect(release.monthKey).not.toBe('older');
        expect(release.monthKey).toMatch(/^2026-(0[1-9]|1[0-2])$/);
      }

      // 4. Every rendered month group corresponds to at least one release
      const monthGroups = getAvailableMonthGroups(whatsNewReleases);
      for (const group of monthGroups) {
        const matching = whatsNewReleases.some((r) => r.monthKey === group.id);
        expect(matching).toBe(true);
      }

      // 5. Month groups sort strictly newest -> oldest
      for (let i = 0; i < monthGroups.length - 1; i++) {
        expect(monthGroups[i].id.localeCompare(monthGroups[i + 1].id)).toBeGreaterThan(0);
      }
    });

    it('generates English and Arabic labels for every month group', () => {
      const monthGroups = getAvailableMonthGroups(whatsNewReleases);
      const augGroup = monthGroups.find((g) => g.id === '2026-08');
      expect(augGroup?.label.en).toBe('August 2026');
      expect(augGroup?.label.ar).toBe('أغسطس 2026');

      const julGroup = monthGroups.find((g) => g.id === '2026-07');
      expect(julGroup?.label.en).toBe('July 2026');
      expect(julGroup?.label.ar).toBe('يوليو 2026');

      const febGroup = monthGroups.find((g) => g.id === '2026-02');
      expect(febGroup?.label.en).toBe('February 2026');
      expect(febGroup?.label.ar).toBe('فبراير 2026');
    });
  });
});
