import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('server/index.ts', 'utf8');
const route = source.slice(source.indexOf("app.post('/api/fetch-url'"), source.indexOf('// ── OG Image generation'));

describe('local /api/fetch-url parity', () => {
  it('returns the same sanitized error codes consumed by the frontend', () => {
    expect(route).toContain("code: 'INVALID_URL'");
    expect(route).toContain("code: 'BLOCKED_URL'");
    expect(route).toContain("code: 'FETCH_TIMEOUT'");
    expect(route).toContain("code: 'RESPONSE_TOO_LARGE'");
    expect(route).not.toContain("console.error('[fetch-url]");
  });
});
