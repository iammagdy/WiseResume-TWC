import { describe, expect, it } from 'vitest';
import {
  extractProtectedTokens,
  findMissingTokens,
  tokensInText,
} from '../protectedTokens';
import type { ResumeData } from '@/types/resume';

const baseResume = (): ResumeData => ({
  contactInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    location: 'NYC',
  },
  summary: 'Senior engineer with 8 years at Google. Drove $2M in revenue and a 35% lift in conversion.',
  experience: [
    {
      id: 'e1',
      company: 'Google',
      position: 'Staff Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      current: true,
      description: 'Led team of 12 across AWS migration. Shipped Kubernetes-based platform handling 50000 req/s.',
      achievements: [
        'Cut p95 latency from 800ms to 120ms using Redis caching.',
        'Mentored 6 engineers on TypeScript best practices.',
      ],
    },
  ],
  education: [
    {
      id: 'edu1',
      institution: 'MIT',
      degree: 'BSc',
      field: 'Computer Science',
      startDate: '2010',
      endDate: '2014',
    },
  ],
  skills: ['React', 'PostgreSQL'],
  certifications: [
    { id: 'c1', name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2022' },
  ],
});

describe('extractProtectedTokens', () => {
  it('captures numbers, percents, and currencies', () => {
    const tokens = extractProtectedTokens(baseResume());
    const text = tokens.map(t => t.text);
    expect(text).toContain('35%');
    expect(text.some(t => t.includes('$2M'))).toBe(true);
    expect(text).toContain('800');
    expect(text).toContain('120');
    expect(text).toContain('50000');
  });

  it('captures dates and date ranges', () => {
    const tokens = extractProtectedTokens(baseResume());
    const text = tokens.map(t => t.text);
    // year(s) from education and from certs
    expect(text).toContain('2010');
    expect(text).toContain('2014');
    expect(text).toContain('2022');
    // Month-Year from experience start
    expect(text.some(t => /^Jan\s+2020$/i.test(t))).toBe(true);
  });

  it('captures companies, schools, and certs from structured fields', () => {
    const tokens = extractProtectedTokens(baseResume());
    const companies = tokens.filter(t => t.kind === 'company').map(t => t.text);
    const schools = tokens.filter(t => t.kind === 'school').map(t => t.text);
    const certs = tokens.filter(t => t.kind === 'cert').map(t => t.text);
    expect(companies).toContain('Google');
    expect(companies).toContain('Amazon');
    expect(schools).toContain('MIT');
    expect(certs).toContain('AWS Solutions Architect');
  });

  it('captures tech allow-list terms only when present in resume', () => {
    const tokens = extractProtectedTokens(baseResume());
    const tech = tokens.filter(t => t.kind === 'tech').map(t => t.text);
    expect(tech).toContain('React');
    expect(tech).toContain('PostgreSQL');
    expect(tech).toContain('Kubernetes');
    expect(tech).toContain('Redis');
    expect(tech).toContain('TypeScript');
    // Not present in resume
    expect(tech).not.toContain('Vue');
  });

  it('captures multi-letter acronyms', () => {
    const tokens = extractProtectedTokens(baseResume());
    const acronyms = tokens.filter(t => t.kind === 'acronym').map(t => t.text);
    expect(acronyms).toContain('AWS');
  });

  it('captures JD keywords only when they appear in the resume', () => {
    const jd = 'Looking for an engineer skilled in Kubernetes and Terraform with PostgreSQL experience.';
    const tokens = extractProtectedTokens(baseResume(), jd);
    const jdKw = tokens.filter(t => t.kind === 'jd-keyword').map(t => t.text);
    // Kubernetes appears in resume description → kept
    expect(jdKw.some(k => /kubernetes/i.test(k))).toBe(true);
    // Terraform NOT in resume → not added
    expect(jdKw.some(k => /terraform/i.test(k))).toBe(false);
  });

  it('produces unique tokens (deduplicated by text+kind)', () => {
    const tokens = extractProtectedTokens(baseResume());
    const keys = tokens.map(t => `${t.text.toLowerCase()}|${t.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('findMissingTokens / tokensInText', () => {
  it('returns missing protected tokens (case-insensitive substring)', () => {
    const tokens = extractProtectedTokens(baseResume());
    const valid = 'Drove $2M in revenue and a 35% lift while at Google.';
    const missing = findMissingTokens(valid, tokens.filter(t =>
      ['$2M', '35%', 'Google'].includes(t.text),
    ));
    expect(missing).toHaveLength(0);
  });

  it('flags rewrites that drop a protected token', () => {
    const tokens = extractProtectedTokens(baseResume());
    const bad = 'Drove millions in revenue and a big lift while at Google.';
    const subset = tokens.filter(t => ['$2M', '35%'].includes(t.text));
    const missing = findMissingTokens(bad, subset);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.map(m => m.text)).toEqual(expect.arrayContaining(['$2M', '35%']));
  });

  it('tokensInText only returns tokens present in the candidate', () => {
    const tokens = extractProtectedTokens(baseResume());
    const sentence = 'Cut p95 latency from 800ms to 120ms using Redis caching.';
    const present = tokensInText(sentence, tokens).map(t => t.text);
    expect(present).toContain('Redis');
    expect(present).toContain('800');
    expect(present).toContain('120');
    expect(present).not.toContain('Google');
  });
});
