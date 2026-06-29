import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateCoverLetterNativePDF, generateNativePDF, PDFServerUnavailableError } from './nativePdfGenerator';

function createPdfFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/export/pdf-native')) {
      return Promise.resolve(
        new Response('%PDF-1.7', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      );
    }
    return Promise.resolve(new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } }));
  });
}

function pdfNativeCallBody(fetchSpy: ReturnType<typeof createPdfFetchMock>) {
  const pdfCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('/api/export/pdf-native'));
  expect(pdfCall).toBeDefined();
  return JSON.parse(pdfCall![1].body);
}

describe('generateNativePDF', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends serialized HTML to the PDF server so exported PDFs keep text and links', async () => {
    const template = document.createElement('div');
    template.setAttribute('data-resume-template', 'true');
    template.innerHTML =
      '<div data-pdf-exclude class="border-dashed border-primary/70">guide</div>' +
      '<section data-section="summary"><a href="https://github.com/example">example</a></section>';
    Object.defineProperty(template, 'scrollHeight', { value: 1650, configurable: true });
    Object.defineProperty(template, 'offsetHeight', { value: 1650, configurable: true });

    const fetchSpy = createPdfFetchMock();
    vi.stubGlobal('fetch', fetchSpy);

    await generateNativePDF(template, {
      pageFormat: 'letter',
      showPageNumbers: true,
      showBranding: true,
      customBreakPositions: [1225, 700],
    });

    const body = pdfNativeCallBody(fetchSpy);
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/export/pdf-native'))).toBe(true);
    expect(body).toMatchObject({
      pageFormat: 'letter',
      showPageNumbers: true,
      showBranding: true,
      totalContentHeightPx: 1650,
      customBreakPositions: [1225, 700],
    });
    expect(body.html).toContain('https://github.com/example');
    expect(body.html).toContain('WiseResume');
    expect(body.html).not.toContain('data-pdf-exclude');
    expect(body.html).not.toContain('border-dashed');
  });

  it('treats non-PDF success responses as an unavailable PDF server', async () => {
    const template = document.createElement('div');
    template.setAttribute('data-resume-template', 'true');
    template.innerHTML = '<section data-section="summary">summary</section>';
    Object.defineProperty(template, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(template, 'offsetHeight', { value: 400, configurable: true });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<!doctype html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    ));

    await expect(generateNativePDF(template)).rejects.toBeInstanceOf(PDFServerUnavailableError);
  });

  it('keeps custom page cuts in the live preview height coordinate space', async () => {
    const template = document.createElement('div');
    template.setAttribute('data-resume-template', 'true');
    template.innerHTML = '<section data-section="summary">summary</section>';
    Object.defineProperty(template, 'scrollHeight', { value: 1650, configurable: true });
    Object.defineProperty(template, 'offsetHeight', { value: 1650, configurable: true });
    const section = template.querySelector('[data-section]') as HTMLElement;
    Object.defineProperty(section, 'offsetHeight', { value: 1192, configurable: true });
    Object.defineProperty(section, 'offsetTop', { value: 0, configurable: true });

    const fetchSpy = createPdfFetchMock();
    vi.stubGlobal('fetch', fetchSpy);

    await generateNativePDF(template, {
      pageFormat: 'letter',
      customBreakPositions: [1225],
    });

    const body = pdfNativeCallBody(fetchSpy);
    expect(body.totalContentHeightPx).toBe(1650);
    expect(body.customBreakPositions).toEqual([1225]);
  });

  it('sends Arabic locale and an RTL HTML document to Chromium', async () => {
    const template = document.createElement('div');
    template.innerHTML = '<section data-section="summary">الملخص المهني</section>';
    Object.defineProperty(template, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(template, 'offsetHeight', { value: 400, configurable: true });
    const fetchSpy = createPdfFetchMock();
    vi.stubGlobal('fetch', fetchSpy);

    await generateNativePDF(template, { locale: 'ar' });

    const body = pdfNativeCallBody(fetchSpy);
    expect(body.locale).toBe('ar');
    expect(body.html).toContain('<html lang="ar" dir="rtl">');
    expect(body.html).toContain('font-family: "Noto Sans Arabic"');
  });

  it('routes Arabic cover letters through Chromium instead of StandardFonts', async () => {
    const fetchSpy = createPdfFetchMock();
    vi.stubGlobal('fetch', fetchSpy);

    await generateCoverLetterNativePDF({
      job_title: 'مدير المنتجات',
      company: 'شركة الحلول المتقدمة',
      content: 'السادة فريق التوظيف،\nيسعدني التقدم إلى الوظيفة.',
    }, undefined, { locale: 'ar' });

    const body = pdfNativeCallBody(fetchSpy);
    expect(body.locale).toBe('ar');
    expect(body.html).toContain('dir="rtl"');
    expect(body.html).toContain('السادة فريق التوظيف');
  });
});
