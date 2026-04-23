import { describe, expect, it } from 'vitest';
import { scoreResume, scoreSentence } from '../sentenceScorer';
import { extractProtectedTokens } from '../protectedTokens';
import type { ResumeData } from '@/types/resume';

describe('scoreSentence', () => {
  it('penalises sentences with protected tokens', () => {
    const tokens = [{ text: '35%', kind: 'percent' as const }, { text: '$2M', kind: 'currency' as const }];
    const protectedScore = scoreSentence({
      text: 'Drove $2M in revenue and a 35% conversion lift across the platform.',
      ageYears: 1,
      protectedTokens: tokens,
    });
    const fillerScore = scoreSentence({
      text: 'Drove really very basically actually some revenue and a quite lift across the platform.',
      ageYears: 1,
      protectedTokens: tokens,
    });
    // Filler-heavy sentence with no protected tokens scores higher
    // (= better candidate to shorten) than the trust-token-rich one.
    expect(fillerScore.score).toBeGreaterThan(protectedScore.score);
  });

  it('rewards filler-heavy text', () => {
    const a = scoreSentence({ text: 'Built a pipeline that scaled to millions.', ageYears: 0, protectedTokens: [] });
    const b = scoreSentence({
      text: 'Really very actually basically built a pipeline that scaled to millions.',
      ageYears: 0,
      protectedTokens: [],
    });
    expect(b.fillerCount).toBeGreaterThan(a.fillerCount);
    expect(b.score).toBeGreaterThan(a.score);
  });

  it('rewards older roles over current ones', () => {
    const old = scoreSentence({ text: 'Built a small internal tool.', ageYears: 10, protectedTokens: [] });
    const recent = scoreSentence({ text: 'Built a small internal tool.', ageYears: 0, protectedTokens: [] });
    expect(old.score).toBeGreaterThan(recent.score);
  });
});

describe('scoreResume', () => {
  const resume: ResumeData = {
    contactInfo: { fullName: 'X', email: 'x@y.com', phone: '1', location: 'L' },
    summary: 'Engineer.',
    experience: [
      {
        id: 'e1',
        company: 'Acme',
        position: 'Engineer',
        startDate: '2010',
        endDate: '2015',
        current: false,
        description: 'A really very basically lengthy description that goes on and on and on and on with filler words and not much substance, but still occupies many lines.',
        achievements: ['Did a thing.', 'Did another thing with metrics 25%.'],
      },
      {
        id: 'e2',
        company: 'Recent Co',
        position: 'Senior',
        startDate: '2024',
        endDate: 'Present',
        current: true,
        description: 'Cut p95 latency from 800ms to 120ms using Redis.',
        achievements: ['Shipped Kubernetes platform handling 50000 req/s.'],
      },
    ],
    education: [],
    skills: [],
  };

  it('returns sentences sorted by descending score', () => {
    const tokens = extractProtectedTokens(resume);
    const scored = scoreResume(resume, tokens);
    expect(scored.length).toBeGreaterThan(0);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it('places filler-heavy old description above protected-token-rich recent text', () => {
    const tokens = extractProtectedTokens(resume);
    const scored = scoreResume(resume, tokens);
    const oldDesc = scored.find(s => s.location.kind === 'experience-description' && s.location.experienceId === 'e1');
    const recentDesc = scored.find(s => s.location.kind === 'experience-description' && s.location.experienceId === 'e2');
    expect(oldDesc).toBeDefined();
    expect(recentDesc).toBeDefined();
    expect(oldDesc!.score).toBeGreaterThan(recentDesc!.score);
  });
});
