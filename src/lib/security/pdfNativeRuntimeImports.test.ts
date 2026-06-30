import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('pdf-native Vercel runtime imports', () => {
  it('uses explicit JavaScript extensions for relative runtime imports', () => {
    const sourcePath = resolve(process.cwd(), 'api/export/pdf-native.ts');
    const source = readFileSync(sourcePath, 'utf8');
    const relativeRuntimeImports = [...source.matchAll(
      /import\s+(?!type\b)[\s\S]*?\sfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g,
    )].map((match) => match[1]);

    expect(relativeRuntimeImports).not.toEqual([]);
    expect(relativeRuntimeImports).toEqual(
      expect.arrayContaining(relativeRuntimeImports.map(() =>
        expect.stringMatching(/\.(?:c|m)?js$/),
      )),
    );
  });

  it('uses a statically traceable Chromium import so Vercel ships its binaries', () => {
    const source = readFileSync(resolve(process.cwd(), 'api/export/pdf-native.ts'), 'utf8');

    expect(source).toMatch(
      /import\s+chromium\s+from\s+['"]@sparticuz\/chromium['"];?/,
    );
    expect(source).not.toContain("new Function('specifier', 'return import(specifier)')");
  });
});
