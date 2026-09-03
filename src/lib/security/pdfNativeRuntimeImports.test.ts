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

    expect(relativeRuntimeImports.length).toBeGreaterThan(0);
    for (const specifier of relativeRuntimeImports) {
      expect(specifier).toMatch(/\.(?:c|m)?js$/);
    }
  });

  it('configures vercel.json includeFiles and lazy dynamic Chromium import for serverless boot safety', () => {
    const source = readFileSync(resolve(process.cwd(), 'api/export/pdf-native.ts'), 'utf8');
    const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));

    expect(vercelConfig.functions?.['api/export/pdf-native.ts']?.includeFiles).toMatch(/@sparticuz\/chromium/);
    expect(source).not.toMatch(/import\s+chromium\s+from\s+['"]@sparticuz\/chromium['"];?/);
    expect(source).toMatch(/import\(['"]@sparticuz\/chromium['"]\)/);
    expect(source).not.toContain("new Function('specifier', 'return import(specifier)')");
  });
});
