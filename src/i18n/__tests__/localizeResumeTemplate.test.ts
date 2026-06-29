import { describe, expect, it } from 'vitest';
import { localizeResumeTemplateElement } from '../localizeResumeTemplate';

describe('localizeResumeTemplateElement', () => {
  it('localizes section headings across template markup without changing user content', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-section="experience">
        <h2>Experience</h2>
        <article><h3>مدير المنتجات الرقمية - AI Platform</h3></article>
      </section>
      <section data-section="education"><div><h2>Education</h2></div></section>
    `;

    localizeResumeTemplateElement(root, 'ar');

    expect(root.querySelector('[data-section="experience"] > h2')).toHaveTextContent('الخبرة العملية');
    expect(root.querySelector('[data-section="education"] h2')).toHaveTextContent('التعليم');
    expect(root).toHaveTextContent('مدير المنتجات الرقمية - AI Platform');
    expect(root.dir).toBe('rtl');
    expect(root.lang).toBe('ar');
  });

  it('restores English generated headings when the document locale changes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section data-section="summary"><h2>الملخص المهني</h2></section>';
    localizeResumeTemplateElement(root, 'en');
    expect(root.querySelector('h2')).toHaveTextContent('Summary');
    expect(root.dir).toBe('ltr');
  });
});
