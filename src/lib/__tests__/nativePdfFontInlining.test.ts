import { afterEach, describe, expect, it, vi } from 'vitest';
import { inlineArabicFontAssets } from '@/lib/nativePdfGenerator';

describe('Arabic PDF font embedding', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('replaces external Noto Arabic font URLs with self-contained data URLs', async () => {
    const fontBytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);
    const fetchMock = vi.fn(async () => new Response(fontBytes, {
      status: 200,
      headers: { 'Content-Type': 'font/woff2' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const css = [
      '@font-face{font-family:"Noto Sans Arabic";',
      'src:url("https://wiseresume.app/assets/noto-sans-arabic-arabic-400.woff2") format("woff2")}',
      '@font-face{font-family:"Inter";src:url("https://wiseresume.app/assets/inter-400.woff2")}',
    ].join('');

    const result = await inlineArabicFontAssets(css);

    expect(result).toContain('data:font/woff2;base64,d09GMg==');
    expect(result).not.toContain('https://wiseresume.app/assets/noto-sans-arabic-arabic-400.woff2');
    expect(result).toContain('https://wiseresume.app/assets/inter-400.woff2');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
