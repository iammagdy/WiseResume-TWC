import { describe, expect, it } from 'vitest';
import {
  assertPublicHttpUrl,
  isPrivateOrLocalHostname,
  isPrivateOrLocalIpAddress,
  isPuppeteerRequestUrlAllowed,
  resolveRedirectUrl,
} from './ssrfGuards';

describe('ssrfGuards', () => {
  it('rejects local and metadata hostnames before network access', () => {
    expect(() => assertPublicHttpUrl('file:///etc/passwd')).toThrow(/http/i);
    expect(() => assertPublicHttpUrl('http://localhost:3000')).toThrow(/not permitted/i);
    expect(() => assertPublicHttpUrl('http://127.0.0.1')).toThrow(/not permitted/i);
    expect(() => assertPublicHttpUrl('http://169.254.169.254/latest/meta-data')).toThrow(/not permitted/i);
    expect(() => assertPublicHttpUrl('http://printer.local')).toThrow(/not permitted/i);
  });

  it('identifies private IPv4 and IPv6 ranges', () => {
    expect(isPrivateOrLocalIpAddress('10.0.0.5')).toBe(true);
    expect(isPrivateOrLocalIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateOrLocalIpAddress('192.168.1.1')).toBe(true);
    expect(isPrivateOrLocalIpAddress('100.64.0.1')).toBe(true);
    expect(isPrivateOrLocalIpAddress('::1')).toBe(true);
    expect(isPrivateOrLocalIpAddress('fd00::1')).toBe(true);
    expect(isPrivateOrLocalIpAddress('8.8.8.8')).toBe(false);
  });

  it('validates every redirect hop target', () => {
    const publicBase = new URL('https://example.com/start');
    expect(resolveRedirectUrl(publicBase, '/next').toString()).toBe('https://example.com/next');
    expect(() => resolveRedirectUrl(publicBase, 'http://169.254.169.254/latest')).toThrow(/not permitted/i);
    expect(() => resolveRedirectUrl(publicBase, 'http://localhost:8080/')).toThrow(/not permitted/i);
  });

  it('allows only inline or inert resources for Chromium HTML rendering', () => {
    expect(isPuppeteerRequestUrlAllowed('about:blank')).toBe(true);
    expect(isPuppeteerRequestUrlAllowed('data:image/png;base64,abc')).toBe(true);
    expect(isPuppeteerRequestUrlAllowed('file:///etc/passwd')).toBe(false);
    expect(isPuppeteerRequestUrlAllowed('http://127.0.0.1:5001/private.png')).toBe(false);
    expect(isPuppeteerRequestUrlAllowed('https://example.com/font.woff2')).toBe(false);
  });

  it('treats literal private hostnames as unsafe even before DNS resolution', () => {
    expect(isPrivateOrLocalHostname('localhost')).toBe(true);
    expect(isPrivateOrLocalHostname('0.0.0.0')).toBe(true);
    expect(isPrivateOrLocalHostname('[::1]')).toBe(true);
    expect(isPrivateOrLocalHostname('example.com')).toBe(false);
  });
});
