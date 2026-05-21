import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateNativePDF, PDFServerUnavailableError } from './nativePdfGenerator';

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

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('%PDF-1.7', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await generateNativePDF(template, {
      pageFormat: 'letter',
      showPageNumbers: true,
      showBranding: true,
      customBreakPositions: [1225, 700],
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/export/pdf-native', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
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

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('%PDF-1.7', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await generateNativePDF(template, {
      pageFormat: 'letter',
      customBreakPositions: [1225],
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.totalContentHeightPx).toBe(1650);
    expect(body.customBreakPositions).toEqual([1225]);
  });
});
