import { readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ARABIC_SCRIPT = /[\u0600-\u06ff]/;
const SOURCE_ROOT = resolve('src');
const LOCALE_ROOT = resolve('locales/en');

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value).reduce<Record<string, string>>((result, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return { ...result, ...flatten(child, path) };
  }, {});
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'test') return [];
      return listSourceFiles(path);
    }
    if (!['.ts', '.tsx'].includes(extname(entry.name)) || entry.name.includes('.test.')) return [];
    return [path];
  });
}

function loadEnglishCatalog(): Record<string, string> {
  return readdirSync(LOCALE_ROOT)
    .filter((name) => name.endsWith('.json'))
    .reduce<Record<string, string>>((catalog, name) => {
      const namespace = name.replace(/\.json$/, '');
      const values = JSON.parse(readFileSync(resolve(LOCALE_ROOT, name), 'utf8'));
      for (const [key, value] of Object.entries(flatten(values))) catalog[`${namespace}.${key}`] = value;
      return catalog;
    }, {});
}

describe('English UI fallback coverage', () => {
  it('gives every static Arabic t() fallback a non-Arabic English catalog value', () => {
    const english = loadEnglishCatalog();
    const missing: string[] = [];
    const callPattern = /\bt\(\s*['"]([^'"]+)['"]\s*,\s*(['"`])([\s\S]*?)\2/g;

    for (const file of listSourceFiles(SOURCE_ROOT)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(callPattern)) {
        const [, key, , fallback] = match;
        if (!ARABIC_SCRIPT.test(fallback)) continue;
        const englishValue = english[key];
        if (!englishValue || ARABIC_SCRIPT.test(englishValue)) {
          const line = source.slice(0, match.index).split('\n').length;
          missing.push(`${file.replace(`${SOURCE_ROOT}\\`, '')}:${line} -> ${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
