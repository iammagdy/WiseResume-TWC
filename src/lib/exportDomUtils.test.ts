import { describe, expect, it } from 'vitest';
import { cloneResumeTemplateElement } from './exportDomUtils';

describe('cloneResumeTemplateElement', () => {
  it('removes screen preview transforms before PDF export', () => {
    const template = document.createElement('div');
    template.style.width = '612px';
    template.style.transform = 'scale(0.5)';
    template.style.transformOrigin = 'top left';
    template.innerHTML = '<section data-section="summary">Summary</section>';

    const clone = cloneResumeTemplateElement(template, 612);

    expect(clone.style.transform).toBe('none');
    expect(clone.style.width).toBe('612px');
    expect(clone.innerHTML).toContain('Summary');
  });
});
