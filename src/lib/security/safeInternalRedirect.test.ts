import { describe, expect, it } from 'vitest';
import { safeInternalRedirect } from './safeInternalRedirect';

describe('safeInternalRedirect', () => {
  it.each([
    '/dashboard',
    '/ar/resumes?tab=recent#top',
    '/jobs/application/123',
  ])('keeps same-origin application paths: %s', value => {
    expect(safeInternalRedirect(value)).toBe(value);
  });

  it.each([
    'https://attacker.example',
    '//attacker.example/path',
    '/\\attacker.example',
    '/%5cattacker.example',
    '/%2f%2fattacker.example',
    '/%252f%252fattacker.example',
    '/dashboard%0d%0aLocation:%20https://attacker.example',
    'javascript:alert(1)',
    ' /dashboard',
  ])('rejects external or ambiguous redirect input: %s', value => {
    expect(safeInternalRedirect(value)).toBe('/dashboard');
  });
});
