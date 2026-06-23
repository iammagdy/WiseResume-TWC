import { describe, it, expect } from 'vitest';
import { deriveResumeCompletion, PORTFOLIO_SKILL_THRESHOLD } from '../portfolioCompletion';

// Regression coverage for the portfolio completion bug: Appwrite stores a
// resume's `skills`/`experience` as JSON-encoded STRINGS, but the completion
// logic used to call Array.isArray() directly on those strings — which is
// always false — so "Skills" and "Work experience" showed as missing even on
// fully-populated resumes. deriveResumeCompletion must parse first.

describe('deriveResumeCompletion', () => {
  it('counts skills/experience stored as JSON strings (the original bug)', () => {
    const resume = {
      skills: JSON.stringify(['React', 'TypeScript', 'Node', 'CSS']),
      experience: JSON.stringify([
        { id: '1', position: 'Engineer' },
        { id: '2', position: 'Lead' },
      ]),
    };
    const r = deriveResumeCompletion(resume);
    expect(r.skillsCount).toBe(4);
    expect(r.experienceCount).toBe(2);
    expect(r.hasSkills).toBe(true);
    expect(r.hasExperience).toBe(true);
  });

  it('also handles already-parsed arrays', () => {
    const resume = {
      skills: ['a', 'b', 'c'],
      experience: [{ id: '1' }],
    };
    const r = deriveResumeCompletion(resume);
    expect(r.skillsCount).toBe(3);
    expect(r.hasSkills).toBe(true);
    expect(r.hasExperience).toBe(true);
  });

  it('requires at least PORTFOLIO_SKILL_THRESHOLD skills for hasSkills', () => {
    const justUnder = deriveResumeCompletion({
      skills: JSON.stringify(Array(PORTFOLIO_SKILL_THRESHOLD - 1).fill('x')),
    });
    expect(justUnder.hasSkills).toBe(false);

    const atThreshold = deriveResumeCompletion({
      skills: JSON.stringify(Array(PORTFOLIO_SKILL_THRESHOLD).fill('x')),
    });
    expect(atThreshold.hasSkills).toBe(true);
  });

  it('treats empty / missing / malformed values as zero', () => {
    expect(deriveResumeCompletion(null)).toMatchObject({
      skillsCount: 0,
      experienceCount: 0,
      hasSkills: false,
      hasExperience: false,
    });
    expect(deriveResumeCompletion({})).toMatchObject({ skillsCount: 0, experienceCount: 0 });
    expect(deriveResumeCompletion({ skills: '[]', experience: '[]' })).toMatchObject({
      skillsCount: 0,
      experienceCount: 0,
    });
    // Malformed JSON falls back to an empty array rather than throwing.
    expect(deriveResumeCompletion({ skills: 'not json', experience: '{bad' })).toMatchObject({
      skillsCount: 0,
      experienceCount: 0,
    });
  });
});
