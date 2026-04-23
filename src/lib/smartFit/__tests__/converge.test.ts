import { describe, it, expect } from 'vitest';
import { convergeSmartFitPlan, verifyTokensPreserved } from '../converge';
import { applySmartFitPlan } from '../orchestrator';
import type { SmartFitPlan, ProtectedToken } from '../types';
import type { ResumeData } from '@/types/resume';

function makeResume(): ResumeData {
  return {
    id: 'r1',
    title: 'Senior Engineer',
    templateId: 'modern',
    contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
    summary: 'Senior engineer with 8 years of experience leading distributed systems at scale. Shipped systems handling 2M requests per day across AWS and GCP.',
    experience: [
      {
        id: 'e1',
        position: 'Senior Engineer',
        company: 'Acme Corp',
        startDate: '2021-01',
        endDate: 'Present',
        description: 'Led platform team of 6 engineers. Built event-driven pipeline ingesting 500K events/sec. Migrated legacy monolith to microservices on Kubernetes.',
        achievements: [
          'Reduced p99 latency from 800ms to 120ms by introducing Redis caching layer.',
          'Cut AWS bill by $1.2M/year through right-sizing and reserved-instance planning.',
          'Mentored 4 junior engineers; 2 promoted to senior within 18 months.',
        ],
      },
      {
        id: 'e2',
        position: 'Engineer',
        company: 'Globex',
        startDate: '2018-03',
        endDate: '2020-12',
        description: 'Worked on internal data tooling.',
        achievements: ['Built CSV importer used by ops team daily.'],
      },
    ],
    education: [],
    skills: ['Python', 'Go', 'Kubernetes'],
    customization: { fontScale: 1, pageFormat: 'letter', targetPageCount: 1 },
  } as unknown as ResumeData;
}

function makePlan(resume: ResumeData): SmartFitPlan {
  return {
    targetPages: 1,
    pagesBefore: 3,
    pagesAfterLayout: 3,
    stagesRun: ['layout', 'rewrite', 'prune', 'collapse'],
    stillOverflowing: false,
    rewrites: [
      {
        id: 'rw:e1:desc:0',
        location: { kind: 'experience-description', experienceId: 'e1' },
        sentenceIndex: 1,
        before: 'Built event-driven pipeline ingesting 500K events/sec.',
        after: 'Built pipeline ingesting 500K events/sec.',
        preserved: [{ text: '500K', kind: 'number' }] as ProtectedToken[],
        validated: true,
        reason: 'Top-scoring long sentence in an experience description.',
      },
    ],
    drops: [
      {
        id: 'drop:e2:0',
        experienceId: 'e2',
        achievementIndex: 0,
        text: 'Built CSV importer used by ops team daily.',
        reason: 'Lowest-impact bullet in an older role.',
      },
    ],
    collapses: [],
  };
}

describe('convergeSmartFitPlan', () => {
  it('stops as soon as measure() returns ≤ targetPages', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    // Mock measure: starts at 3, drops by 1 with each apply.
    let pages = 3;
    const measure = async () => pages--;

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    expect(result.finalPages).toBeLessThanOrEqual(1);
    expect(result.stillOverflowing).toBe(false);
    // We should have stopped early — not every edit was needed.
    const totalAccepted =
      result.recommended.rewrites.size +
      result.recommended.drops.size +
      result.recommended.collapses.size;
    expect(totalAccepted).toBeLessThanOrEqual(plan.rewrites.length + plan.drops.length);
  });

  it('returns empty selection when baseline is already at target', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    const measure = async () => 1;

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    expect(result.finalPages).toBe(1);
    expect(result.recommended.rewrites.size).toBe(0);
    expect(result.recommended.drops.size).toBe(0);
    expect(result.recommended.collapses.size).toBe(0);
    expect(result.layoutFit).toBeUndefined();
  });

  it('drops no-op edits from the recommendation', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    // Mock measure: never decreases, so every edit is a no-op.
    const measure = async () => 3;

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    expect(result.finalPages).toBe(3);
    expect(result.stillOverflowing).toBe(true);
    expect(result.recommended.rewrites.size).toBe(0);
    expect(result.recommended.drops.size).toBe(0);
  });

  it('proposes a layout fit when shrinking fontScale alone reaches the target', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    // Mock measure: returns 3 unless customization.fontScale < 1, then 1.
    const measure = async (r: ResumeData) =>
      (r.customization?.fontScale ?? 1) < 1 ? 1 : 3;

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    expect(result.layoutFit).toBeDefined();
    expect(result.layoutFit!.fontScaleAfter).toBeLessThan(1);
    expect(result.layoutFit!.pagesAfter).toBeLessThanOrEqual(1);
    expect(result.recommended.layoutFit).toBe(true);
    // No content edits should be needed because layout alone solved it.
    expect(result.recommended.rewrites.size).toBe(0);
    expect(result.recommended.drops.size).toBe(0);
  });

  it('preserves every protected token after applying the recommended plan', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    // Force the convergence to accept everything by always reporting overflow.
    let calls = 0;
    const measure = async () => {
      calls++;
      // Drop pages just enough so a rewrite + a drop are accepted.
      if (calls <= 2) return 3;
      if (calls <= 4) return 2;
      return 1;
    };

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    const merged = applySmartFitPlan(resume, plan, result.recommended);
    const check = verifyTokensPreserved(resume, merged, undefined);

    if (!check.ok) {
      throw new Error(`Missing tokens: ${check.missing.map(m => m.text).join(', ')}`);
    }
    expect(check.ok).toBe(true);
  });

  it('reports stillOverflowing when no combination of edits hits the target', async () => {
    const resume = makeResume();
    const plan = makePlan(resume);
    // Mock measure: even applying everything only gets us to 2 pages.
    let pages = 3;
    const measure = async () => {
      pages = Math.max(2, pages - 0.5);
      return Math.ceil(pages);
    };

    const result = await convergeSmartFitPlan({
      resume, plan, targetPages: 1, measure,
    });

    expect(result.stillOverflowing).toBe(true);
    expect(result.finalPages).toBeGreaterThan(1);
  });
});
