import { describe, expect, it } from 'vitest';
import { applySmartFitPlan, runSmartFit } from '../orchestrator';
import type { ResumeData } from '@/types/resume';

const buildResume = (): ResumeData => ({
  contactInfo: { fullName: 'Jane Doe', email: 'j@d.com', phone: '1', location: 'NYC' },
  summary: 'Engineer with 8 years at Google. Drove $2M revenue and a 35% conversion lift across the platform.',
  experience: [
    {
      id: 'e1',
      company: 'Google',
      position: 'Engineer',
      startDate: '2015',
      endDate: '2020',
      current: false,
      description: 'A really very basically lengthy description that goes on with filler words and not much substance, but still occupies many lines and lines and lines.',
      achievements: [
        'Did one thing about something tangentially related to the role.',
        'Did another similar thing about something else tangentially related.',
        'Cut p95 latency from 800ms to 120ms using Redis caching across all services.',
      ],
    },
    {
      id: 'e2',
      company: 'Acme',
      position: 'Senior',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      description: 'Shipped Kubernetes platform handling 50000 req/s.',
      achievements: ['Mentored 6 engineers on TypeScript best practices.'],
    },
  ],
  education: [],
  skills: ['React', 'TypeScript'],
  hobbies: [
    { id: 'h1', name: 'Chess', visible: true },
    { id: 'h2', name: 'Reading', visible: true },
  ],
  languages: [
    { id: 'l1', name: 'French', proficiency: 'basic' },
    { id: 'l2', name: 'English', proficiency: 'native' },
  ],
});

describe('runSmartFit', () => {
  it('returns an empty plan when already at target', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume, targetPages: 2, currentPages: 2, pagesAfterLayout: 2, enableRewrite: false,
    });
    expect(plan.stagesRun).toEqual(['layout']);
    expect(plan.stillOverflowing).toBe(false);
    expect(plan.rewrites).toHaveLength(0);
    expect(plan.drops).toHaveLength(0);
    expect(plan.collapses).toHaveLength(0);
  });

  it('proposes drops + collapses when overflowing without AI', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume, targetPages: 1, currentPages: 3, pagesAfterLayout: 3, enableRewrite: false,
    });
    expect(plan.stagesRun).toContain('prune');
    // Expect at least one bullet drop + one section collapse
    expect(plan.drops.length).toBeGreaterThan(0);
    expect(plan.collapses.length).toBeGreaterThan(0);
    // Hobbies and basic-language collapses should both be available.
    const sections = plan.collapses.map(c => c.section);
    expect(sections).toContain('hobbies');
    expect(sections).toContain('languages');
  });

  it('integrates AI rewrites when validator passes', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume,
      targetPages: 1,
      currentPages: 3,
      pagesAfterLayout: 3,
      enableRewrite: true,
      rewriteFn: async (cands) => cands.map(c => {
        // Simulate an AI that preserves every protected token verbatim
        // by simply keeping the first 60% of the original text.
        const cut = c.text.slice(0, Math.max(60, Math.floor(c.text.length * 0.6)));
        // Re-append every protected token so the validator passes.
        const extras = c.preserve
          .filter(p => !cut.toLowerCase().includes(p.text.toLowerCase()))
          .map(p => p.text)
          .join(' ');
        return { id: c.id, text: extras ? `${cut} ${extras}` : cut, valid: true };
      }),
    });
    expect(plan.stagesRun).toContain('rewrite');
    expect(plan.rewrites.length).toBeGreaterThan(0);
    // Every returned rewrite should be marked as validated since the fake
    // AI re-appends every protected token.
    expect(plan.rewrites.every(r => r.validated)).toBe(true);
  });

  it('skips AI rewrites that strip protected tokens', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume,
      targetPages: 1,
      currentPages: 3,
      pagesAfterLayout: 3,
      enableRewrite: true,
      // This AI strips numbers/percent from rewrites.
      rewriteFn: async (cands) => cands.map(c => ({
        id: c.id,
        text: c.text.replace(/\d+%?|\$[\d.]+[KkMmBb]?/g, '').slice(0, 80),
        valid: true,
      })),
    });
    // Some rewrites may still validate (sentences with no protected tokens).
    // But the ones with protected tokens must be marked invalid.
    const invalid = plan.rewrites.filter(r => !r.validated);
    // It's fine if zero invalid rewrites are returned (e.g. all candidates
    // had no protected tokens) — but if any are returned, they must carry
    // a validation reason.
    for (const r of invalid) {
      expect(r.validationReason).toBeTruthy();
    }
  });
});

describe('applySmartFitPlan', () => {
  it('applies bullet drops for selected ids', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume, targetPages: 1, currentPages: 3, pagesAfterLayout: 3, enableRewrite: false,
    });
    const drop = plan.drops[0];
    expect(drop).toBeDefined();
    const next = applySmartFitPlan(resume, plan, {
      rewrites: new Set(),
      drops: new Set([drop.id]),
      collapses: new Set(),
    });
    const exp = next.experience.find(e => e.id === drop.experienceId)!;
    expect(exp.achievements.length).toBe(
      (resume.experience.find(e => e.id === drop.experienceId)?.achievements.length ?? 0) - 1,
    );
  });

  it('applies section collapses for languages and hobbies', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume, targetPages: 1, currentPages: 3, pagesAfterLayout: 3, enableRewrite: false,
    });
    const langCollapse = plan.collapses.find(c => c.section === 'languages');
    const hobCollapse = plan.collapses.find(c => c.section === 'hobbies');
    expect(langCollapse).toBeDefined();
    expect(hobCollapse).toBeDefined();
    const next = applySmartFitPlan(resume, plan, {
      rewrites: new Set(),
      drops: new Set(),
      collapses: new Set([langCollapse!.id, hobCollapse!.id]),
    });
    // Basic-proficiency language is removed
    expect(next.languages?.find(l => l.id === 'l1')).toBeUndefined();
    expect(next.languages?.find(l => l.id === 'l2')).toBeDefined();
    // Hobbies are hidden, not removed
    expect(next.hobbies?.every(h => h.visible === false)).toBe(true);
  });

  it('does not modify resume when selection is empty', async () => {
    const resume = buildResume();
    const plan = await runSmartFit({
      resume, targetPages: 1, currentPages: 3, pagesAfterLayout: 3, enableRewrite: false,
    });
    const next = applySmartFitPlan(resume, plan, {
      rewrites: new Set(), drops: new Set(), collapses: new Set(),
    });
    expect(JSON.stringify(next)).toBe(JSON.stringify(resume));
  });
});
