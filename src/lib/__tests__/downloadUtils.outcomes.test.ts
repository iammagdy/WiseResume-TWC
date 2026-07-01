import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, validateDocxBlob, validatePdfBlob } from '@/lib/downloadUtils';

describe('download artifact validation', () => {
  it('rejects an empty PDF', async () => {
    await expect(validatePdfBlob(new Blob([], { type: 'application/pdf' }))).rejects.toThrow(/empty/i);
  });

  it('rejects bytes without a PDF signature', async () => {
    await expect(validatePdfBlob(new Blob(['not a pdf'.repeat(20)], { type: 'application/pdf' }))).rejects.toThrow(/signature/i);
  });

  it('accepts a non-empty PDF with a valid signature', async () => {
    await expect(validatePdfBlob(new Blob(['%PDF-1.7\n', 'x'.repeat(128)], { type: 'application/pdf' }))).resolves.toBeUndefined();
  });

  it('rejects a ZIP that is not a DOCX package', async () => {
    const zip = new JSZip();
    zip.file('random.txt', 'not docx');
    await expect(validateDocxBlob(await zip.generateAsync({ type: 'blob' }))).rejects.toThrow(/DOCX package/i);
  });

  it('accepts a DOCX package with required entries', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types/>');
    zip.file('word/document.xml', '<document/>');
    await expect(validateDocxBlob(await zip.generateAsync({ type: 'blob' }))).resolves.toBeUndefined();
  });
});

describe('download outcomes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('reports failed when the desktop trigger throws', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });

    await expect(downloadFile({ blob: new Blob(['data']), fileName: 'test.txt' })).resolves.toMatchObject({
      outcome: 'failed',
      method: 'anchor',
    });
  });

  it('reports failed without creating a URL for an empty blob', async () => {
    const result = await downloadFile({ blob: new Blob([]), fileName: 'empty.txt' });
    expect(result.outcome).toBe('failed');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
