import { describe, expect, it, vi } from 'vitest';
import { fetchUrlHtml, normalizePublicUrl, UrlImportRequestError, urlImportErrorKey } from './urlImportClient';

describe('URL import client', () => {
  it('normalizes public URLs and rejects malformed hostnames before the request', () => {
    expect(normalizePublicUrl('example.com/resume')).toBe('https://example.com/resume');
    expect(() => normalizePublicUrl('https://not a valid host')).toThrowError('INVALID_URL');
    expect(() => normalizePublicUrl('file:///etc/passwd')).toThrowError('BLOCKED_URL');
  });
  it('returns HTML only for a successful endpoint response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ html: '<main>Resume content</main>' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    await expect(fetchUrlHtml('https://example.com/resume', fetchImpl)).resolves.toBe('<main>Resume content</main>');
  });

  it('rejects endpoint errors so the flow cannot falsely continue', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      code: 'BLOCKED_URL',
      error: 'This URL cannot be imported.',
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    await expect(fetchUrlHtml('http://127.0.0.1', fetchImpl)).rejects.toMatchObject({
      name: 'UrlImportRequestError',
      code: 'BLOCKED_URL',
    });
  });

  it('turns network failures into a controlled client error', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('internal network detail'); });
    await expect(fetchUrlHtml('https://example.com', fetchImpl)).rejects.toEqual(
      new UrlImportRequestError('FETCH_FAILED'),
    );
  });

  it.each([
    ['BLOCKED_URL', 'app.uploadPage.urlImport.blocked'],
    ['FETCH_TIMEOUT', 'app.uploadPage.urlImport.timeout'],
    ['RESPONSE_TOO_LARGE', 'app.uploadPage.urlImport.tooLarge'],
    ['UNREADABLE_CONTENT', 'app.uploadPage.urlImport.noReadableText'],
    ['FETCH_FAILED', 'app.uploadPage.urlImport.importFailed'],
  ])('maps %s to localized visible copy', (code, key) => {
    expect(urlImportErrorKey(code)).toBe(key);
  });
});
