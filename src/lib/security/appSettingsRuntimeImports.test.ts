import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('app-settings Vercel runtime imports', () => {
  it('uses explicit JavaScript extensions for relative runtime imports', () => {
    const source = readFileSync(resolve(process.cwd(), 'api/app-settings.ts'), 'utf8');
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
});
