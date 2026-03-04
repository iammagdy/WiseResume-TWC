import { describe, it, expect, vi } from 'vitest';

// Mock supabase before importing scorer
vi.mock('@/integrations/supabase/safeClient', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { scoreJobMatch } from '../jobMatchScorer';
import type { ResumeData } from '@/types/resume';
import type { Job } from '@/hooks/useJobs';

// ─── Factories ───

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    contactInfo: { fullName: '', email: '', phone: '', location: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    templateId: 'modern',
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Acme',
    location: 'Remote',
    job_type: 'full-time',
    description: '',
    requirements: '',
    posted_date: '2024-01-01',
    is_saved: false,
    user_id: 'u1',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

// ─── Tests ───

describe('scoreJobMatch', () => {
  it('returns isAIVerified: false', () => {
    const result = scoreJobMatch(makeResume(), makeJob());
    expect(result.isAIVerified).toBe(false);
  });

  it('returns low skillMatch for empty resume vs detailed job', () => {
    const job = makeJob({ description: 'React TypeScript Node.js GraphQL Docker Kubernetes' });
    const result = scoreJobMatch(makeResume(), job);
    expect(result.skillMatch).toBeLessThan(30);
  });

  it('returns high skillMatch when resume skills match job keywords', () => {
    const job = makeJob({ description: 'React TypeScript testing' });
    const resume = makeResume({ skills: ['React', 'TypeScript', 'testing'] });
    const result = scoreJobMatch(resume, job);
    expect(result.skillMatch).toBeGreaterThan(50);
  });

  it('populates found and missing keyword arrays', () => {
    const job = makeJob({ description: 'React Python Django' });
    const resume = makeResume({ skills: ['React'] });
    const result = scoreJobMatch(resume, job);
    expect(result.keywords.found.length).toBeGreaterThan(0);
    expect(result.keywords.missing.length).toBeGreaterThan(0);
  });

  it('gives low experienceMatch for senior job with no experience', () => {
    const job = makeJob({ title: 'Senior Software Engineer' });
    const result = scoreJobMatch(makeResume(), job);
    expect(result.experienceMatch).toBeLessThanOrEqual(30);
  });

  it('gives high experienceMatch for junior job with little experience', () => {
    const job = makeJob({ title: 'Junior Developer' });
    const resume = makeResume({
      experience: [{
        id: '1', company: 'Co', position: 'Dev',
        startDate: '2023-01', endDate: '2024-01',
        current: false, description: '', achievements: [],
      }],
    });
    const result = scoreJobMatch(resume, job);
    expect(result.experienceMatch).toBeGreaterThanOrEqual(70);
  });

  it('overall score is capped at 100', () => {
    const job = makeJob({ title: 'Developer', description: 'coding' });
    const resume = makeResume({
      skills: ['coding', 'developer'],
      summary: 'coding developer',
      experience: [{
        id: '1', company: 'Co', position: 'coding developer',
        startDate: '2018-01', endDate: '', current: true,
        description: 'coding', achievements: ['coding'],
      }],
    });
    const result = scoreJobMatch(resume, job);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});
