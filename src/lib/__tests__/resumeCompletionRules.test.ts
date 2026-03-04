import { describe, it, expect } from 'vitest';
import {
  calcContactScore,
  calcSummaryScore,
  calcExperienceScore,
  calcEducationScore,
  calcSkillsScore,
  calcOverallScore,
  getSectionStatus,
  getNextIncompleteSection,
} from '../resumeCompletionRules';
import type { ContactInfo, Experience, Education, ResumeData } from '@/types/resume';

// ─── Factories ───

function makeContact(overrides: Partial<ContactInfo> = {}): ContactInfo {
  return { fullName: '', email: '', phone: '', location: '', ...overrides };
}

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: '1', company: '', position: '', startDate: '', endDate: '',
    current: false, description: '', achievements: [], ...overrides,
  };
}

function makeEducation(overrides: Partial<Education> = {}): Education {
  return {
    id: '1', institution: '', degree: '', field: '', startDate: '', endDate: '', ...overrides,
  };
}

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    contactInfo: makeContact(),
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    templateId: 'modern',
    ...overrides,
  };
}

// ─── calcContactScore ───

describe('calcContactScore', () => {
  it('returns 0 for empty contact', () => {
    expect(calcContactScore(makeContact())).toBe(0);
  });

  it('returns 20 per filled field', () => {
    expect(calcContactScore(makeContact({ fullName: 'John' }))).toBe(20);
    expect(calcContactScore(makeContact({ fullName: 'John', email: 'a@b.com' }))).toBe(40);
  });

  it('returns 100 when all fields filled (linkedin counts)', () => {
    expect(calcContactScore(makeContact({
      fullName: 'John', email: 'a@b.com', phone: '123', location: 'NYC', linkedin: 'url',
    }))).toBe(100);
  });

  it('portfolio also satisfies the last 20 points', () => {
    expect(calcContactScore(makeContact({
      fullName: 'John', email: 'a@b.com', phone: '123', location: 'NYC', portfolio: 'url',
    }))).toBe(100);
  });
});

// ─── calcSummaryScore ───

describe('calcSummaryScore', () => {
  it('returns 0 for empty', () => {
    expect(calcSummaryScore('')).toBe(0);
  });

  it('returns 25 for <20 words', () => {
    expect(calcSummaryScore('hello world test')).toBe(25);
  });

  it('returns 50 for 20-49 words', () => {
    const words = Array(25).fill('word').join(' ');
    expect(calcSummaryScore(words)).toBe(50);
  });

  it('returns 75 for 50-149 words', () => {
    const words = Array(80).fill('word').join(' ');
    expect(calcSummaryScore(words)).toBe(75);
  });

  it('returns 100 for 150+ words', () => {
    const words = Array(160).fill('word').join(' ');
    expect(calcSummaryScore(words)).toBe(100);
  });
});

// ─── calcExperienceScore ───

describe('calcExperienceScore', () => {
  it('returns 0 for empty array', () => {
    expect(calcExperienceScore([])).toBe(0);
  });

  it('returns 25 for company+position only', () => {
    expect(calcExperienceScore([makeExperience({ company: 'Acme', position: 'Dev' })])).toBe(25);
  });

  it('returns 50 with dates', () => {
    expect(calcExperienceScore([
      makeExperience({ company: 'Acme', position: 'Dev', startDate: '2020-01' }),
    ])).toBe(50);
  });

  it('returns 75 with 1 entry having 2+ bullets', () => {
    expect(calcExperienceScore([
      makeExperience({ company: 'Acme', position: 'Dev', startDate: '2020-01', achievements: ['a', 'b'] }),
    ])).toBe(75);
  });

  it('returns 100 with 2+ entries having 2+ bullets', () => {
    const entry = (id: string) => makeExperience({
      id, company: 'Acme', position: 'Dev', startDate: '2020-01', achievements: ['a', 'b'],
    });
    expect(calcExperienceScore([entry('1'), entry('2')])).toBe(100);
  });
});

// ─── calcEducationScore ───

describe('calcEducationScore', () => {
  it('returns 0 for empty', () => {
    expect(calcEducationScore([])).toBe(0);
  });

  it('returns 33 for institution only', () => {
    expect(calcEducationScore([makeEducation({ institution: 'MIT' })])).toBe(33);
  });

  it('returns 66 for institution + degree', () => {
    expect(calcEducationScore([makeEducation({ institution: 'MIT', degree: 'BS' })])).toBe(66);
  });

  it('returns 100 for institution + degree + endDate', () => {
    expect(calcEducationScore([
      makeEducation({ institution: 'MIT', degree: 'BS', endDate: '2022' }),
    ])).toBe(100);
  });
});

// ─── calcSkillsScore ───

describe('calcSkillsScore', () => {
  it('returns 0 for empty', () => {
    expect(calcSkillsScore([])).toBe(0);
  });

  it('returns 40 for <5 skills', () => {
    expect(calcSkillsScore(['a', 'b', 'c'])).toBe(40);
  });

  it('returns 70 for 5-9 skills', () => {
    expect(calcSkillsScore(Array(7).fill('s'))).toBe(70);
  });

  it('returns 100 for 10+ skills', () => {
    expect(calcSkillsScore(Array(12).fill('s'))).toBe(100);
  });
});

// ─── calcOverallScore ───

describe('calcOverallScore', () => {
  it('returns 0 for empty resume', () => {
    expect(calcOverallScore(makeResume())).toBe(0);
  });

  it('returns average of all section scores', () => {
    const resume = makeResume({
      contactInfo: makeContact({ fullName: 'J', email: 'e', phone: 'p', location: 'l', linkedin: 'li' }),
      summary: Array(160).fill('w').join(' '),
      experience: [
        makeExperience({ id: '1', company: 'A', position: 'B', startDate: '2020', achievements: ['a', 'b'] }),
        makeExperience({ id: '2', company: 'C', position: 'D', startDate: '2021', achievements: ['c', 'd'] }),
      ],
      education: [makeEducation({ institution: 'MIT', degree: 'BS', endDate: '2022' })],
      skills: Array(10).fill('s'),
    });
    expect(calcOverallScore(resume)).toBe(100);
  });
});

// ─── getSectionStatus ───

describe('getSectionStatus', () => {
  it('maps 0 → empty, 50 → partial, 100 → complete', () => {
    expect(getSectionStatus(0)).toBe('empty');
    expect(getSectionStatus(50)).toBe('partial');
    expect(getSectionStatus(100)).toBe('complete');
  });
});

// ─── getNextIncompleteSection ───

describe('getNextIncompleteSection', () => {
  it('returns first incomplete section', () => {
    expect(getNextIncompleteSection(makeResume())).toBe('contact');
  });

  it('returns null when all complete', () => {
    const resume = makeResume({
      contactInfo: makeContact({ fullName: 'J', email: 'e', phone: 'p', location: 'l', linkedin: 'li' }),
      summary: Array(160).fill('w').join(' '),
      experience: [
        makeExperience({ id: '1', company: 'A', position: 'B', startDate: '2020', achievements: ['a', 'b'] }),
        makeExperience({ id: '2', company: 'C', position: 'D', startDate: '2021', achievements: ['c', 'd'] }),
      ],
      education: [makeEducation({ institution: 'MIT', degree: 'BS', endDate: '2022' })],
      skills: Array(10).fill('s'),
    });
    expect(getNextIncompleteSection(resume)).toBeNull();
  });
});
