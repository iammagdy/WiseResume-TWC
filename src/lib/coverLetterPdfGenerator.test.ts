import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateCoverLetterPDF } from './coverLetterPdfGenerator';

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const text = await page.getTextContent();
    pages.push(text.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n');
}

const letter = {
  job_title: 'Product Engineer',
  company: 'Acme',
  content: 'Hello hiring team. This is a focused cover letter.',
  template_style: 'professional',
  created_at: '2026-08-17T00:00:00.000Z',
};

describe('cover-letter PDF export options', () => {
  afterEach(() => vi.restoreAllMocks());

  it('removes WiseResume marks and honors simple page numbers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const bytes = await generateCoverLetterPDF(letter, {
      showPageNumbers: true,
      pageNumberFormat: 'simple',
      showBranding: false,
    });
    const text = await extractPdfText(bytes);

    expect(text).toContain('Product Engineer');
    expect(text).toMatch(/\b1\b/);
    expect(text).not.toContain('WiseResume');
    expect(text).not.toContain('Page 1 of 1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honors full page numbers and keeps branding when requested', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    const bytes = await generateCoverLetterPDF(letter, {
      showPageNumbers: true,
      pageNumberFormat: 'full',
      showBranding: true,
    });
    const text = await extractPdfText(bytes);

    expect(text).toContain('Page 1 of 1');
    expect(text).toContain('WiseResume');
  });

  it('omits both footer controls when both settings are off', async () => {
    const bytes = await generateCoverLetterPDF(letter, {
      showPageNumbers: false,
      showBranding: false,
    });
    const text = await extractPdfText(bytes);

    expect(text).not.toContain('Page 1 of 1');
    expect(text).not.toContain('WiseResume');
  });

  it('uses the saved A4 paper size', async () => {
    const bytes = await generateCoverLetterPDF(letter, {
      pageFormat: 'a4',
      showBranding: false,
    });
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
  });
});
