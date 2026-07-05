import { describe, it, expect } from 'vitest';
import {
  computeDedupeKey,
  computeContentHash,
  parseRemotiveJob,
  parseJobicyJob,
  parseWwrRssItem,
  createExcerpt,
} from '../remoteJobsFeed';

describe('Remote Jobs Normalizer & Deduplication', () => {
  describe('Dedupe Key Generation', () => {
    it('generates primary dedupe key using source and sourceJobId', () => {
      const key = computeDedupeKey('remotive', '12345', 'Acme Corp', 'Frontend Engineer', 'https://remotive.com/job/12345');
      expect(key).toBe('remotive:12345');
    });

    it('falls back to lowercased company + title + canonicalUrl if sourceJobId is missing', () => {
      const key = computeDedupeKey('weworkremotely', '', 'Acme Corp', 'Frontend Engineer', 'https://weworkremotely.com/jobs/1');
      expect(key).toBe('acme corp|frontend engineer|https://weworkremotely.com/jobs/1');
    });
  });

  describe('Content Hash Generation', () => {
    it('generates consistent content hash', () => {
      const hash1 = computeContentHash('Developer', 'Company A', 'https://example.com/job', '2026-07-05T00:00:00Z');
      const hash2 = computeContentHash('Developer', 'Company A', 'https://example.com/job', '2026-07-05T00:00:00Z');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^h_[0-9a-f]+$/);
    });

    it('changes hash when title or company changes', () => {
      const hash1 = computeContentHash('Senior Developer', 'Company A', 'https://example.com/job');
      const hash2 = computeContentHash('Junior Developer', 'Company A', 'https://example.com/job');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Remotive Normalizer', () => {
    it('normalizes valid Remotive job payload', () => {
      const rawRemotive = {
        id: 99123,
        url: 'https://remotive.com/remote-jobs/software-dev/full-stack-engineer-99123',
        title: 'Full Stack Engineer',
        company_name: 'Wise Corp',
        company_logo: 'https://remotive.com/logo.png',
        category: 'Software Development',
        tags: ['React', 'Node.js'],
        job_type: 'full_time',
        publication_date: '2026-07-05T12:00:00',
        candidate_required_location: 'Worldwide',
        salary: '$120k - $150k',
        description: '<p>Great role for a <strong>Full Stack Engineer</strong> building modern web apps.</p>',
      };

      const normalized = parseRemotiveJob(rawRemotive);
      expect(normalized).not.toBeNull();
      expect(normalized?.source).toBe('remotive');
      expect(normalized?.source_job_id).toBe('99123');
      expect(normalized?.title).toBe('Full Stack Engineer');
      expect(normalized?.company).toBe('Wise Corp');
      expect(normalized?.dedupe_key).toBe('remotive:99123');
      expect(normalized?.description_excerpt).toContain('Great role for a Full Stack Engineer');
    });

    it('returns null if required fields are missing', () => {
      expect(parseRemotiveJob({})).toBeNull();
      expect(parseRemotiveJob({ title: 'Engineer' })).toBeNull();
    });
  });

  describe('Jobicy Normalizer', () => {
    it('normalizes valid Jobicy job payload', () => {
      const rawJobicy = {
        id: 'jobicy-456',
        url: 'https://jobicy.com/jobs/456-backend-developer',
        jobTitle: 'Backend Developer',
        companyName: 'Cloud Systems',
        companyLogo: 'https://jobicy.com/logo.png',
        jobCategory: 'DevOps & IT',
        jobType: 'full-time',
        pubDate: '2026-07-04T10:00:00Z',
        jobGeo: 'US Only',
        annualSalaryMin: '100000',
        annualSalaryMax: '130000',
        salaryCurrency: 'USD',
        jobDescription: '<div>Building scalable backend microservices.</div>',
      };

      const normalized = parseJobicyJob(rawJobicy);
      expect(normalized).not.toBeNull();
      expect(normalized?.source).toBe('jobicy');
      expect(normalized?.source_job_id).toBe('jobicy-456');
      expect(normalized?.title).toBe('Backend Developer');
      expect(normalized?.salary_min).toBe(100000);
      expect(normalized?.salary_max).toBe(130000);
      expect(normalized?.salary_currency).toBe('USD');
    });
  });

  describe('We Work Remotely RSS Normalizer', () => {
    it('normalizes valid WWR RSS item', () => {
      const rawWwr = {
        guid: 'https://weworkremotely.com/jobs/7890',
        link: 'https://weworkremotely.com/jobs/7890-senior-frontend-engineer',
        title: 'WiseResume: Senior Frontend Engineer',
        pubDate: 'Sun, 05 Jul 2026 14:00:00 +0000',
        category: 'Full Stack Programming',
        description: 'We are looking for a Senior Frontend Engineer.',
      };

      const normalized = parseWwrRssItem(rawWwr);
      expect(normalized).not.toBeNull();
      expect(normalized?.source).toBe('weworkremotely');
      expect(normalized?.company).toBe('WiseResume');
      expect(normalized?.title).toBe('Senior Frontend Engineer');
      expect(normalized?.canonical_url).toBe('https://weworkremotely.com/jobs/7890-senior-frontend-engineer');
    });
  });

  describe('Excerpt Sanitizer', () => {
    it('strips HTML tags and truncates cleanly', () => {
      const html = '<h1>Title</h1><p>This is a <strong>test description</strong> with HTML formatting.</p>';
      const excerpt = createExcerpt(html, 30);
      expect(excerpt).toBe('Title This is a test descripti...');
      expect(excerpt).not.toContain('<');
    });
  });
});
