import { describe, it, expect } from 'vitest';
import {
  computeDedupeKey,
  computeContentHash,
  parseRemotiveJob,
  parseJobicyJob,
  parseWwrRssItem,
  parseRemoteOkJob,
  parseArbeitnowJob,
  classifyRoleGroup,
  parseSalaryInfo,
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

  describe('Role Group Classification Engine', () => {
    it('classifies Easy / Entry Level roles', () => {
      expect(classifyRoleGroup('Junior Customer Support Agent')).toBe('easy_entry_level');
      expect(classifyRoleGroup('Entry Level Content Moderator')).toBe('easy_entry_level');
      expect(classifyRoleGroup('Marketing Intern')).toBe('easy_entry_level');
    });

    it('classifies Data Entry roles', () => {
      expect(classifyRoleGroup('Remote Data Entry Clerk')).toBe('data_entry');
      expect(classifyRoleGroup('Spreadsheet Processing Specialist')).toBe('data_entry');
    });

    it('classifies Virtual Assistant roles', () => {
      expect(classifyRoleGroup('Executive Virtual Assistant')).toBe('virtual_assistant');
      expect(classifyRoleGroup('Remote Personal Assistant')).toBe('virtual_assistant');
    });

    it('classifies Customer Support roles', () => {
      expect(classifyRoleGroup('Customer Support Specialist', 'Customer Support')).toBe('customer_support');
      expect(classifyRoleGroup('Tier 2 Help Desk Specialist')).toBe('customer_support');
    });

    it('classifies Writing & Content roles', () => {
      expect(classifyRoleGroup('Senior Technical Writer')).toBe('writing');
      expect(classifyRoleGroup('B2B Copywriter')).toBe('content_writer');
    });

    it('classifies Tech & Programming roles', () => {
      expect(classifyRoleGroup('Backend Engineer', 'Programming')).toBe('tech_programming');
      expect(classifyRoleGroup('DevOps Lead')).toBe('tech_programming');
    });
  });

  describe('Salary / Rate Parser Engine', () => {
    it('parses hourly rates correctly', () => {
      const res = parseSalaryInfo('$25 / hour');
      expect(res.period).toBe('hourly');
      expect(res.display).toContain('/hour');
    });

    it('parses monthly rates correctly', () => {
      const res = parseSalaryInfo('$3,500 per month');
      expect(res.period).toBe('monthly');
      expect(res.display).toContain('/month');
    });

    it('parses yearly rates correctly', () => {
      const res = parseSalaryInfo('$80k - $120k / year');
      expect(res.period).toBe('yearly');
      expect(res.display).toContain('/year');
    });

    it('handles missing salary gracefully', () => {
      const res = parseSalaryInfo('');
      expect(res.period).toBe('unknown');
      expect(res.display).toBe('Salary not listed');
      expect(res.amountMin).toBeNull();
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
      expect(normalized?.role_group).toBe('tech_programming');
    });
  });

  describe('RemoteOK Normalizer', () => {
    it('normalizes valid RemoteOK job payload and skips legal/meta object', () => {
      const legalNotice = { legal: 'Terms of service and API usage' };
      expect(parseRemoteOkJob(legalNotice)).toBeNull();

      const rawRemoteOk = {
        id: 'remoteok-5544',
        position: 'Junior Customer Support Representative',
        company: 'HelpDesk Co',
        url: 'https://remoteok.com/remote-jobs/remoteok-5544',
        date: '2026-07-04T12:00:00Z',
        tags: ['customer support', 'entry level'],
        salary_min: 40000,
        salary_max: 55000,
        description: 'Customer support role for beginners.',
      };

      const normalized = parseRemoteOkJob(rawRemoteOk);
      expect(normalized).not.toBeNull();
      expect(normalized?.source).toBe('remoteok');
      expect(normalized?.company).toBe('HelpDesk Co');
      expect(normalized?.company_logo).toBeUndefined(); // Do not use RemoteOK logo
      expect(normalized?.role_group).toBe('easy_entry_level');
      expect(normalized?.salary_display).toContain('/year');
    });
  });

  describe('Arbeitnow Normalizer', () => {
    it('normalizes Arbeitnow job only when remote is true', () => {
      const nonRemote = { title: 'Office Manager', company_name: 'Berlin HQ', remote: false, url: 'https://arbeitnow.com/1' };
      expect(parseArbeitnowJob(nonRemote)).toBeNull();

      const remoteJob = {
        slug: 'arbeitnow-9988',
        title: 'Virtual Administrative Assistant',
        company_name: 'Euro Tech',
        remote: true,
        url: 'https://www.arbeitnow.com/view/arbeitnow-9988',
        created_at: 1783300000,
        tags: ['admin', 'virtual assistant'],
        description: 'Administrative support role for global clients.',
      };

      const normalized = parseArbeitnowJob(remoteJob);
      expect(normalized).not.toBeNull();
      expect(normalized?.source).toBe('arbeitnow');
      expect(normalized?.role_group).toBe('virtual_assistant');
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
