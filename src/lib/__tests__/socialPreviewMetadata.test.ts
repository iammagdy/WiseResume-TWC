import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const socialImage = readFileSync(resolve(process.cwd(), 'public/wiseresume-og.png'));
const documentNode = new DOMParser().parseFromString(html, 'text/html');

function metaContent(selector: string): string {
  const value = documentNode.querySelector<HTMLMetaElement>(selector)?.content;
  expect(value, `Missing metadata: ${selector}`).toBeTruthy();
  return value ?? '';
}

describe('social preview metadata', () => {
  it('exposes one absolute crawler-visible image URL', () => {
    const expectedUrl = 'https://wiseresume.app/wiseresume-og.png?v=5';

    expect(metaContent('meta[property="og:image"]')).toBe(expectedUrl);
    expect(metaContent('meta[property="og:image:secure_url"]')).toBe(expectedUrl);
    expect(metaContent('meta[name="twitter:image"]')).toBe(expectedUrl);

    const inlineScripts = Array.from(documentNode.scripts)
      .filter((script) => !script.src)
      .map((script) => script.textContent ?? '')
      .join('\n');
    expect(inlineScripts).not.toContain('app-og-image');
    expect(inlineScripts).not.toContain('app-twitter-image');
  });

  it('declares metadata that matches the delivered PNG', () => {
    expect(socialImage.subarray(1, 4).toString('ascii')).toBe('PNG');

    const actualWidth = socialImage.readUInt32BE(16);
    const actualHeight = socialImage.readUInt32BE(20);

    expect(Number(metaContent('meta[property="og:image:width"]'))).toBe(actualWidth);
    expect(Number(metaContent('meta[property="og:image:height"]'))).toBe(actualHeight);
    expect(metaContent('meta[property="og:image:type"]')).toBe('image/png');
  });

  it('describes the preview image for both Open Graph and X', () => {
    const expectedAlt = 'WiseResume AI resume builder and ATS optimization dashboard';

    expect(metaContent('meta[property="og:image:alt"]')).toBe(expectedAlt);
    expect(metaContent('meta[name="twitter:image:alt"]')).toBe(expectedAlt);
  });
});
