import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'locales');
const namespaces = (await readdir(resolve(root, 'en'))).filter((file) => file.endsWith('.json')).sort();
const allowedIdentical = new Set(['WiseResume', 'WiseHire', 'ATS', 'LinkedIn', 'GitHub', 'A4']);

function flatten(value, prefix = '', output = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      if (child && typeof child === 'object') flatten(child, path, output);
      else output.set(path, child);
    });
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') flatten(child, path, output);
    else output.set(path, child);
  }
  return output;
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]).sort();
}

const failures = [];
for (const namespace of namespaces) {
  const [englishRaw, arabicRaw] = await Promise.all([
    readFile(resolve(root, 'en', namespace), 'utf8'),
    readFile(resolve(root, 'ar', namespace), 'utf8'),
  ]);
  const english = flatten(JSON.parse(englishRaw));
  const arabic = flatten(JSON.parse(arabicRaw));
  const allKeys = new Set([...english.keys(), ...arabic.keys()]);

  for (const key of allKeys) {
    const id = `${namespace}:${key}`;
    if (!english.has(key)) failures.push(`${id} is missing from English`);
    if (!arabic.has(key)) failures.push(`${id} is missing from Arabic`);
    const en = english.get(key);
    const ar = arabic.get(key);
    if (typeof en !== 'string' || en.trim() === '') failures.push(`${id} has an empty English value`);
    if (typeof ar !== 'string' || ar.trim() === '') failures.push(`${id} has an empty Arabic value`);
    if (typeof en === 'string' && typeof ar === 'string') {
      if (JSON.stringify(placeholders(en)) !== JSON.stringify(placeholders(ar))) {
        failures.push(`${id} has mismatched placeholders`);
      }
      if (en === ar && !allowedIdentical.has(en) && /[A-Za-z]/.test(en)) {
        failures.push(`${id} appears untranslated: ${JSON.stringify(en)}`);
      }
    }
  }
}

if (failures.length) {
  console.error(`[i18n] ${failures.length} validation failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[i18n] OK: ${namespaces.length} namespaces have matching, non-empty catalogs and placeholders.`);
