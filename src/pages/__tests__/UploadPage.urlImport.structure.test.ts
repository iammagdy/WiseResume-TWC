import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/pages/UploadPage.tsx', 'utf8');

describe('UploadPage URL import error state', () => {
  it('renders endpoint failures as a persistent accessible alert', () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('noValidate');
    expect(source).toContain('urlImportErrorKey');
    expect(source).toContain('setUrlError(t(urlImportErrorKey');
  });
});
