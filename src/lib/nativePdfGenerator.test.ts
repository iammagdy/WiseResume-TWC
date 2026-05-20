import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cloneResumeTemplateElement,
  createPdfCaptureContainer,
} from './exportDomUtils';

describe('generateNativePDF', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the html2canvas capture host rendered while moving it off-screen', () => {
    const container = createPdfCaptureContainer(612);

    expect(container.style.position).toBe('fixed');
    expect(container.style.left).toBe('-10000px');
    expect(container.style.width).toBe('612px');
    expect(container.style.visibility).not.toBe('hidden');
    expect(container.style.display).not.toBe('none');
    expect(container.style.opacity).not.toBe('0');
  });

  it('strips editor-only nodes from the exported resume clone', () => {
    const template = document.createElement('div');
    template.setAttribute('data-resume-template', 'true');
    template.innerHTML =
      '<div data-pdf-exclude class="border-dashed border-primary/70">guide</div>' +
      '<section data-section="summary"><a href="https://github.com/example">example</a></section>';

    const clone = cloneResumeTemplateElement(template, 612);

    expect(clone.innerHTML).toContain('https://github.com/example');
    expect(clone.innerHTML).not.toContain('data-pdf-exclude');
    expect(clone.innerHTML).not.toContain('border-dashed');
    expect(clone.style.width).toBe('612px');
  });
});
