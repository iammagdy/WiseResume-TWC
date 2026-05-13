import { describe, it, expect } from 'vitest';
import { getUploadErrorCopy } from '@/components/upload/UploadErrorRecovery';

describe('getUploadErrorCopy', () => {
  it('keeps damaged-file wording only for real corruption', () => {
    expect(getUploadErrorCopy('CORRUPTED').compactDescription).toContain('damaged');
    expect(getUploadErrorCopy('UNKNOWN').compactDescription).not.toContain('damaged');
    expect(getUploadErrorCopy('PARSER_RUNTIME_FAILED').compactDescription).not.toContain('damaged');
  });

  it('explains missing parser assets clearly', () => {
    expect(getUploadErrorCopy('PARSER_ASSETS_MISSING').compactDescription).toContain('missing local upload assets');
  });
});
