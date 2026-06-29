import { describe, it, expect } from 'vitest';
import { generateLatex } from '../latexGenerator';
import type { ResumeData } from '@/types/resume';

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '', location: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    templateId: 'modern',
    ...overrides,
  };
}

// ─── Hobbies ────────────────────────────────────────────────────────────────

describe('generateLatex — Hobbies section', () => {
  it('renders visible hobbies as a comma-separated list under an Interests heading', () => {
    const resume = makeResume({
      hobbies: [
        { id: '1', name: 'Hiking', visible: true },
        { id: '2', name: 'Photography', visible: true },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('\\section*{Interests}');
    expect(tex).toContain('Hiking, Photography');
  });

  it('omits hobbies with visible=false', () => {
    const resume = makeResume({
      hobbies: [
        { id: '1', name: 'Hiking', visible: true },
        { id: '2', name: 'Gaming', visible: false },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('Hiking');
    expect(tex).not.toContain('Gaming');
  });

  it('omits the Interests section entirely when all hobbies are hidden', () => {
    const resume = makeResume({
      hobbies: [
        { id: '1', name: 'Gaming', visible: false },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).not.toContain('\\section*{Interests}');
  });

  it('omits the Interests section when hobbies array is empty', () => {
    const resume = makeResume({ hobbies: [] });
    const tex = generateLatex(resume);
    expect(tex).not.toContain('\\section*{Interests}');
  });

  it('escapes LaTeX special characters in hobby names', () => {
    const resume = makeResume({
      hobbies: [
        { id: '1', name: 'R&B Music', visible: true },
        { id: '2', name: '100% Effort', visible: true },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('R\\&B Music');
    expect(tex).toContain('100\\%');
  });
});

// ─── References ─────────────────────────────────────────────────────────────

describe('generateLatex — References section', () => {
  it('outputs "Available upon request." when all references have availableOnRequest=true', () => {
    const resume = makeResume({
      references: [
        { id: '1', name: 'Alice Smith', title: 'Manager', company: 'Acme', email: 'alice@acme.com', phone: '555-1234', relationship: 'manager', availableOnRequest: true },
        { id: '2', name: 'Bob Jones', title: 'Lead', company: 'Corp', email: 'bob@corp.com', phone: '', relationship: 'peer', availableOnRequest: true },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('\\section*{References}');
    expect(tex).toContain('Available upon request.');
    expect(tex).not.toContain('\\begin{itemize}');
  });

  it('renders full contact details for references without availableOnRequest', () => {
    const resume = makeResume({
      references: [
        { id: '1', name: 'Alice Smith', title: 'Engineering Manager', company: 'Acme Corp', email: 'alice@acme.com', phone: '555-1234', relationship: 'manager' },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('\\section*{References}');
    expect(tex).toContain('\\textbf{Alice Smith}');
    expect(tex).toContain('Engineering Manager');
    expect(tex).toContain('Acme Corp');
    expect(tex).toContain('mailto:alice@acme.com');
    expect(tex).toContain('alice@acme.com');
    expect(tex).toContain('555-1234');
  });

  it('renders per-entry "Available upon request" when mixed with full-contact entries', () => {
    const resume = makeResume({
      references: [
        { id: '1', name: 'Alice Smith', title: 'Manager', company: 'Acme', email: 'alice@acme.com', phone: '', relationship: 'manager' },
        { id: '2', name: 'Bob Jones', title: 'Lead', company: 'Corp', email: '', phone: '', relationship: 'peer', availableOnRequest: true },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('\\begin{itemize}');
    expect(tex).toContain('\\textbf{Alice Smith}');
    expect(tex).toContain('\\textbf{Bob Jones}');
    expect(tex).toContain('Available upon request');
  });

  it('omits the References section when array is empty', () => {
    const resume = makeResume({ references: [] });
    const tex = generateLatex(resume);
    expect(tex).not.toContain('\\section*{References}');
  });

  it('escapes LaTeX special characters in reference fields', () => {
    const resume = makeResume({
      references: [
        { id: '1', name: 'O\'Brien & Associates', title: '50% Owner', company: 'Acme_Corp', email: 'test@acme.com', phone: '', relationship: 'owner' },
      ],
    });
    const tex = generateLatex(resume);
    expect(tex).toContain('\\&');
    expect(tex).toContain('50\\%');
    expect(tex).toContain('Acme\\_Corp');
  });
});

// ─── Document structure ───────────────────────────────────────────────────────

describe('generateLatex — document structure', () => {
  it('always produces a valid LaTeX document wrapper', () => {
    const resume = makeResume();
    const tex = generateLatex(resume);
    expect(tex).toContain('\\documentclass');
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('\\end{document}');
  });

  it('uses XeLaTeX, Noto Sans Arabic, RTL support, and Arabic headings for Arabic CVs', () => {
    const resume = makeResume({
      contactInfo: { fullName: 'عبد الرحمن القحطاني', email: 'user@example.com', phone: '+971501234567', location: 'دبي' },
      summary: 'مدير المنتجات الرقمية - AI Platform',
      experience: [{
        id: '1',
        company: 'شركة الحلول المتقدمة (AWS Partner)',
        position: 'مدير المنتجات',
        startDate: '2024-01',
        endDate: '',
        current: true,
        description: 'قيادة المنتجات الرقمية.',
        achievements: [],
      }],
      customization: { documentLocale: 'ar' } as ResumeData['customization'],
    });

    const tex = generateLatex(resume);
    expect(tex).toContain('\\usepackage{fontspec}');
    expect(tex).toContain('\\usepackage{polyglossia}');
    expect(tex).toContain('\\setmainlanguage{arabic}');
    expect(tex).toContain('Noto Sans Arabic');
    expect(tex).toContain('\\section*{الملخص المهني}');
    expect(tex).toContain('حتى الآن');
  });
});
