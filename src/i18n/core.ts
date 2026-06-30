import commonEn from '../../locales/en/common.json';
import landingEn from '../../locales/en/landing.json';
import authEn from '../../locales/en/auth.json';
import appEn from '../../locales/en/app.json';
import editorEn from '../../locales/en/editor.json';
import templatesEn from '../../locales/en/templates.json';
import exportEn from '../../locales/en/export.json';
import wisehireEn from '../../locales/en/wisehire.json';
import errorsEn from '../../locales/en/errors.json';
import notificationsEn from '../../locales/en/notifications.json';
import emailEn from '../../locales/en/email.json';
import commonAr from '../../locales/ar/common.json';
import landingAr from '../../locales/ar/landing.json';
import authAr from '../../locales/ar/auth.json';
import appAr from '../../locales/ar/app.json';
import editorAr from '../../locales/ar/editor.json';
import templatesAr from '../../locales/ar/templates.json';
import exportAr from '../../locales/ar/export.json';
import wisehireAr from '../../locales/ar/wisehire.json';
import errorsAr from '../../locales/ar/errors.json';
import notificationsAr from '../../locales/ar/notifications.json';
import emailAr from '../../locales/ar/email.json';

export type SupportedLocale = 'en' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const LOCALE_STORAGE_KEY = 'wiseresume-locale';

export interface LocaleResolutionInput {
  pathname?: string;
  userPreference?: string | null;
  persistedPreference?: string | null;
  browserLanguages?: readonly string[];
}

const catalogs = {
  en: { common: commonEn, landing: landingEn, auth: authEn, app: appEn, editor: editorEn, templates: templatesEn, export: exportEn, wisehire: wisehireEn, errors: errorsEn, notifications: notificationsEn, email: emailEn },
  ar: { common: commonAr, landing: landingAr, auth: authAr, app: appAr, editor: editorAr, templates: templatesAr, export: exportAr, wisehire: wisehireAr, errors: errorsAr, notifications: notificationsAr, email: emailAr },
} as const;

export function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) return null;
  const base = value.trim().toLowerCase().replace('_', '-').split('-')[0];
  return base === 'ar' || base === 'en' ? base : null;
}

export function localeFromPublicPath(pathname: string | null | undefined): SupportedLocale | null {
  if (!pathname) return null;
  return pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : null;
}

const PUBLIC_LOCALIZED_EXACT_PATHS = new Set([
  '/', '/enterprises', '/pricing', '/whats-new', '/waitlist', '/enterprise',
  '/privacy-policy', '/terms-of-service', '/guides', '/examples', '/auth',
  '/auth/verify-email', '/auth/reset-password', '/auth/callback',
]);

const PUBLIC_LOCALIZED_PREFIXES = ['/guides/', '/p/', '/share/', '/l/', '/interview/report/'];

export function getLocalizedPublicPath(pathname: string, locale: SupportedLocale): string {
  const basePath = pathname === '/ar' ? '/' : pathname.startsWith('/ar/') ? pathname.slice(3) : pathname;
  const isPublic = PUBLIC_LOCALIZED_EXACT_PATHS.has(basePath)
    || PUBLIC_LOCALIZED_PREFIXES.some((prefix) => basePath.startsWith(prefix));
  if (!isPublic) return pathname;
  if (locale === 'ar') return basePath === '/' ? '/ar' : `/ar${basePath}`;
  return basePath;
}

export function resolveLocale(input: LocaleResolutionInput = {}): SupportedLocale {
  const routeLocale = localeFromPublicPath(input.pathname);
  if (routeLocale) return routeLocale;

  const preferenceCandidates = [input.userPreference, input.persistedPreference];
  for (const candidate of preferenceCandidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  for (const candidate of input.browserLanguages ?? []) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

export function isRtlLocale(locale: SupportedLocale): boolean {
  return locale === 'ar';
}

export function directionForLocale(locale: SupportedLocale): TextDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

export function formatAppNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-arab' : 'en-US').format(value);
}

export function formatDocumentNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US').format(value);
}

export function formatDocumentDate(value: string, locale: SupportedLocale): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(present|current)$/i.test(trimmed)) return locale === 'ar' ? 'حتى الآن' : 'Present';

  const monthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (month >= 1 && month <= 12) {
      return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, 1)));
    }
  }
  return trimmed;
}

function getNestedValue(source: unknown, path: readonly string[]): string | undefined {
  let value: unknown = source;
  for (const segment of path) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === 'string' ? value : undefined;
}

export function translate(
  key: string,
  locale: SupportedLocale,
  fallbackOrVariables?: string | Record<string, string | number>,
  maybeVariables?: Record<string, string | number>,
): string {
  const fallback = typeof fallbackOrVariables === 'string' ? fallbackOrVariables : undefined;
  const variables =
    typeof fallbackOrVariables === 'string'
      ? (maybeVariables ?? {})
      : (fallbackOrVariables ?? {});
  const [namespace, ...path] = key.split('.');
  const localeCatalog = catalogs[locale] as Record<string, unknown>;
  const fallbackCatalog = catalogs.en as Record<string, unknown>;
  const raw = getNestedValue(localeCatalog[namespace], path)
    ?? getNestedValue(fallbackCatalog[namespace], path)
    ?? fallback
    ?? key;
  return raw.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(variables[name] ?? `{{${name}}}`));
}

export function getTextDirection(value: string, locale: SupportedLocale): 'ltr' | 'auto' {
  if (locale === 'en') return 'ltr';
  const trimmed = value.trim();
  const isMachineReadable = /@|https?:\/\/|www\.|^[+()\d\s.-]+$|^[\w.-]+\.[a-z]{2,}/i.test(trimmed);
  return isMachineReadable ? 'ltr' : 'auto';
}

export function getCatalogs() {
  return catalogs;
}
