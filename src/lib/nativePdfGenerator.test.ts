import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateNativePDF } from './nativePdfGenerator';

describe('generateNativePDF', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends exact page break, content height, page numbering, and branding options to the PDF server', async () => {
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

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toMatchObject({
      pageFormat: 'letter',
      showPageNumbers: true,
      showBranding: true,
      totalContentHeightPx: 1650,
      customBreakPositions: [700, 1225],
    });
    expect(body.html).toContain('https://github.com/example');
    expect(body.html).not.toContain('data-pdf-exclude');
    expect(body.html).not.toContain('border-dashed');
    expect(body.html).toContain('https://resume.thewise.cloud');
  });
});
