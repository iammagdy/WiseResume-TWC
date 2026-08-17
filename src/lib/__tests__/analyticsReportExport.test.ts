import { describe, expect, it } from 'vitest';
import { buildAnalyticsReportCsv } from '@/lib/analyticsReportExport';

describe('buildAnalyticsReportCsv', () => {
  it('exports honest summary and current-status labels', () => {
    const csv = buildAnalyticsReportCsv({
      generatedAt: '2026-08-17T12:00:00.000Z',
      summary: {
        totalResumes: 2,
        averageReadiness: 71,
        averageCompleteness: 80,
        totalApplications: 3,
        dayStreak: 4,
        activeInterviewOfferShare: 67,
      },
      funnel: [{ stage: 'Tracked', count: 3, pct: 100 }],
      resumes: [{ title: 'Primary', readiness: 71 }],
    });

    expect(csv).toContain('"Average local readiness","71%"');
    expect(csv).toContain('"Current interview or offer share","67%"');
    expect(csv).toContain('"Tracked","3","100%"');
  });

  it('neutralizes spreadsheet formulas in user-controlled titles', () => {
    const csv = buildAnalyticsReportCsv({
      generatedAt: '2026-08-17T12:00:00.000Z',
      summary: {
        totalResumes: 1,
        averageReadiness: 0,
        averageCompleteness: 0,
        totalApplications: 0,
        dayStreak: 0,
        activeInterviewOfferShare: null,
      },
      funnel: [],
      resumes: [{ title: '=HYPERLINK("https://example.test")', readiness: null }],
    });

    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
    expect(csv).toContain('"Not calculated"');
  });
});
