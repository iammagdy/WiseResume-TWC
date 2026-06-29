import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const namespaces = [
  'common',
  'landing',
  'auth',
  'app',
  'editor',
  'templates',
  'export',
  'wisehire',
  'errors',
  'notifications',
  'email',
] as const;

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value).reduce<Record<string, string>>((result, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return { ...result, ...flatten(child, path) };
  }, {});
}

describe('translation catalogs', () => {
  it.each(namespaces)('keeps English and Arabic %s keys in parity', (namespace) => {
    const english = JSON.parse(readFileSync(resolve(`locales/en/${namespace}.json`), 'utf8'));
    const arabic = JSON.parse(readFileSync(resolve(`locales/ar/${namespace}.json`), 'utf8'));
    const englishEntries = flatten(english);
    const arabicEntries = flatten(arabic);

    expect(Object.keys(arabicEntries).sort()).toEqual(Object.keys(englishEntries).sort());
    expect(Object.values(arabicEntries).every((value) => value.trim().length > 0)).toBe(true);
  });
});
