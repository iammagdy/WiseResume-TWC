import { describe, expect, it } from 'vitest';
import { cloneResumeTemplateElement } from './exportDomUtils';

describe('cloneResumeTemplateElement', () => {
  it('removes screen preview transforms before PDF export', () => {
    const template = document.createElement('div');
    template.style.width = '612px';
    template.style.transform = 'scale(0.5)';
    template.style.transformOrigin = 'top left';
    template.style.opacity = '0';
    template.style.visibility = 'hidden';
    template.innerHTML = '<section data-section="summary" style="opacity: 0; transform: translateY(12px);">Summary</section>';

    const clone = cloneResumeTemplateElement(template, 612);
    const section = clone.querySelector('[data-section="summary"]') as HTMLElement;

    expect(clone.style.transform).toBe('none');
    expect(clone.style.opacity).toBe('1');
    expect(clone.style.visibility).toBe('visible');
    expect(section.style.transform).toBe('none');
    expect(section.style.opacity).toBe('1');
    expect(clone.style.width).toBe('612px');
    expect(clone.innerHTML).toContain('Summary');
  });

  it('fits fixed-width page children to the PDF design width', () => {
    const template = document.createElement('div');
    template.style.width = '816px';
    const page = document.createElement('article');
    page.style.width = '816px';
    page.textContent = 'A summary that must wrap instead of being clipped.';
    template.appendChild(page);
    Object.defineProperty(template, 'offsetWidth', { value: 816 });
    Object.defineProperty(page, 'offsetWidth', { value: 816 });

    const clone = cloneResumeTemplateElement(template, 612);
    const clonedPage = clone.querySelector('article') as HTMLElement;

    expect(clone.style.width).toBe('612px');
    expect(clonedPage.style.width).toBe('612px');
    expect(clonedPage.style.maxWidth).toBe('612px');
  });
});
