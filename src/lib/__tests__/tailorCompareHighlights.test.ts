import { describe, expect, it } from 'vitest';

import { applyTailorCompareHighlights } from '@/lib/tailorCompareHighlights';
import type { ResumeData } from '@/types/resume';

const base: ResumeData = {
  id: 'r1',
  templateId: 'modern',
  title: 'CV',
  summary: 'Old summary text',
  contactInfo: { fullName: 'Jane', email: 'a@b.com', phone: '1', location: 'Cairo' },
  skills: ['React', 'Python', 'Docker'],
  experience: [],
  education: [],
  certifications: [],
  awards: [],
  projects: [],
  publications: [],
  volunteering: [],
  hobbies: [],
  references: [],
  languages: [],
};

describe('applyTailorCompareHighlights', () => {
  it('highlights removed skills on the before side', () => {
    const tailored = { ...base, skills: ['React'] };
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-section="skills">
        <h2>Skills</h2>
        <p>React, Python, Docker</p>
      </section>
    `;

    applyTailorCompareHighlights(root, base, tailored, null, { side: 'before' });

    const marks = root.querySelectorAll('.jmw-tailor-mark--removed');
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(root.textContent).toContain('Python');
    expect(root.textContent).toContain('Docker');
  });

  it('does not falsely mark unchanged skills as removed and added', () => {
    const originalResume = {
      ...base,
      skills: ['Service Level Agreements (SLAs)', 'React', 'Python'],
    };
    const tailored = {
      ...originalResume,
      skills: ['Customer Service', 'ServiceLevelAgreements (SLAs)', 'React'],
    };
    const beforeRoot = document.createElement('div');
    beforeRoot.innerHTML = `
      <section data-section="skills">
        <p>Service Level Agreements (SLAs), React, Python</p>
      </section>
    `;
    const afterRoot = document.createElement('div');
    afterRoot.innerHTML = `
      <section data-section="skills">
        <p>Customer Service, ServiceLevelAgreements (SLAs), React</p>
      </section>
    `;

    applyTailorCompareHighlights(beforeRoot, originalResume, tailored, null, { side: 'before' });
    applyTailorCompareHighlights(afterRoot, originalResume, tailored, null, { side: 'after' });

    const beforeMarks = [...beforeRoot.querySelectorAll('.jmw-tailor-mark--removed')].map((el) => el.textContent);
    const afterMarks = [...afterRoot.querySelectorAll('.jmw-tailor-mark--added')].map((el) => el.textContent);

    expect(beforeMarks.some((t) => t?.includes('Service Level'))).toBe(false);
    expect(afterMarks.some((t) => t?.includes('ServiceLevel') || t?.includes('Service Level'))).toBe(false);
    expect(beforeMarks.some((t) => t?.includes('Python'))).toBe(true);
    expect(afterMarks.some((t) => t?.includes('Customer Service'))).toBe(true);
  });

  it('highlights added skills on the after side', () => {
    const tailored = { ...base, skills: ['React', 'Python', 'Docker', 'Zendesk'] };
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-section="skills">
        <h2>Skills</h2>
        <div><span>React</span><span>Python</span><span>Docker</span><span>Zendesk</span></div>
      </section>
    `;

    applyTailorCompareHighlights(root, base, tailored, null, { side: 'after' });

    const added = root.querySelector('.jmw-tailor-mark--added');
    expect(added?.textContent).toBe('Zendesk');
  });
});
