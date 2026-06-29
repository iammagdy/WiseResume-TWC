import { describe, expect, it } from 'vitest';
import {
  formatAppNumber,
  formatDocumentDate,
  formatDocumentNumber,
  getTextDirection,
  getLocalizedPublicPath,
  isRtlLocale,
  normalizeLocale,
  resolveLocale,
  translate,
} from '../core';

describe('Arabic locale foundation', () => {
  it('normalizes supported regional locales without accepting unsupported languages', () => {
    expect(normalizeLocale('ar-SA')).toBe('ar');
    expect(normalizeLocale('ar_AE')).toBe('ar');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBeNull();
  });

  it('resolves explicit Arabic public routes before stored preferences', () => {
    expect(resolveLocale({
      pathname: '/ar/pricing',
      userPreference: 'en',
      persistedPreference: 'en',
      browserLanguages: ['en-US'],
    })).toBe('ar');
  });

  it('uses user, persisted, browser, then English precedence', () => {
    expect(resolveLocale({ userPreference: 'ar', persistedPreference: 'en' })).toBe('ar');
    expect(resolveLocale({ persistedPreference: 'ar', browserLanguages: ['en-US'] })).toBe('ar');
    expect(resolveLocale({ browserLanguages: ['ar-AE', 'en-US'] })).toBe('ar');
    expect(resolveLocale({ browserLanguages: ['fr-FR'] })).toBe('en');
  });

  it('uses Arabic-Indic digits in app UI and Western digits in CV documents', () => {
    expect(formatAppNumber(1234, 'ar')).toMatch(/[١٢٣٤]/);
    expect(formatDocumentNumber(1234, 'ar')).toMatch(/1.*234/);
  });

  it('formats Arabic CV dates with Arabic month names and Western digits', () => {
    expect(formatDocumentDate('2024-01', 'ar')).toBe('يناير 2024');
    expect(formatDocumentDate('Present', 'ar')).toBe('حتى الآن');
  });

  it('provides approved Arabic terminology', () => {
    expect(translate('common.download', 'ar')).toBe('تنزيل');
    expect(translate('templates.sections.experience', 'ar')).toBe('الخبرة العملية');
    expect(translate('export.pageCutSetup', 'ar')).toBe('إعداد فواصل الصفحات');
  });

  it('reports RTL locale and isolates machine-readable values as LTR', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(getTextDirection('name@example.com', 'ar')).toBe('ltr');
    expect(getTextDirection('+971 50 123 4567', 'ar')).toBe('ltr');
    expect(getTextDirection('مدير المنتجات', 'ar')).toBe('auto');
  });

  it('localizes public URLs without changing authenticated routes', () => {
    expect(getLocalizedPublicPath('/pricing', 'ar')).toBe('/ar/pricing');
    expect(getLocalizedPublicPath('/ar/guides/example', 'en')).toBe('/guides/example');
    expect(getLocalizedPublicPath('/dashboard', 'ar')).toBe('/dashboard');
  });
});
