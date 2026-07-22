import { describe, expect, it } from 'vitest';
import {
  getManualChunkName,
  PREFETCH_CHUNKS,
  PUBLIC_PORTFOLIO_PREFETCH_EXCLUSION,
} from '../buildChunkPolicy';

describe('production chunk policy', () => {
  it('keeps shared class-name utilities in a dedicated utility chunk', () => {
    expect(getManualChunkName('/repo/node_modules/clsx/dist/clsx.mjs')).toBe('ui-utils');
    expect(getManualChunkName('/repo/node_modules/class-variance-authority/dist/index.mjs')).toBe('ui-utils');
    expect(getManualChunkName('/repo/node_modules/tailwind-merge/dist/bundle.mjs')).toBe('ui-utils');
  });

  it('keeps only Recharts and D3 packages in the charts manual chunk', () => {
    expect(getManualChunkName('/repo/node_modules/recharts/es6/index.js')).toBe('charts');
    expect(getManualChunkName('/repo/node_modules/d3-scale/src/index.js')).toBe('charts');
  });

  it('does not globally prefetch the Editor route', () => {
    expect(PREFETCH_CHUNKS).not.toContain('EditorPage');
  });

  it('excludes exact public portfolio paths from unrelated app-route prefetches', () => {
    const excludedPath = new RegExp(PUBLIC_PORTFOLIO_PREFETCH_EXCLUSION);

    expect(excludedPath.test('/p/magdy')).toBe(true);
    expect(excludedPath.test('/ar/p/magdy')).toBe(true);
    expect(excludedPath.test('/p/magdy/settings')).toBe(false);
    expect(excludedPath.test('/dashboard')).toBe(false);
  });

  it('preserves heavy lazy dependency ownership', () => {
    expect(getManualChunkName('/repo/node_modules/pdf-lib/es/index.js')).toBe('doc-export');
    expect(getManualChunkName('/repo/node_modules/docx/dist/index.js')).toBe('doc-export');
    expect(getManualChunkName('/repo/node_modules/tesseract.js/src/index.js')).toBe('ocr');
  });
});
