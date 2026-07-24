import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('server/index.ts', 'utf8');
const route = source.slice(source.indexOf("app.post('/api/fetch-url'"), source.indexOf('// ── OG Image generation'));

describe('local /api/fetch-url parity', () => {
  it('delegates to the production handler instead of retaining an unsafe local copy', () => {
    expect(route).toContain('await fetchUrlHandler(req as never, res as never);');
    expect(route).not.toContain('fetchPublicHtmlWithRedirects');
    expect(route).not.toContain('assertResolvedHostIsPublic');
  });
});
