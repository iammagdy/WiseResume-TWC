import { Briefcase } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { APP_SIDEBAR_LINKS, isAppSidebarPathActive } from '@/components/layout/appSidebarNav';

describe('app sidebar navigation', () => {
  it('exposes Jobs after Tailoring Hub with the Briefcase icon', () => {
    const jobsIndex = APP_SIDEBAR_LINKS.findIndex((item) => item.path === '/jobs');
    const tailoringHubIndex = APP_SIDEBAR_LINKS.findIndex((item) => item.path === '/tailoring-hub');
    const activityIndex = APP_SIDEBAR_LINKS.findIndex((item) => item.path === '/applications');

    expect(APP_SIDEBAR_LINKS[jobsIndex]).toMatchObject({
      path: '/jobs',
      label: 'Jobs',
      icon: Briefcase,
      match: ['/jobs'],
    });
    expect(jobsIndex).toBeGreaterThan(tailoringHubIndex);
    expect(jobsIndex).toBeLessThan(activityIndex);
  });

  it('matches the Jobs feed without treating a job detail route as active', () => {
    const jobs = APP_SIDEBAR_LINKS.find((item) => item.path === '/jobs');

    expect(jobs).toBeDefined();
    expect(isAppSidebarPathActive('/jobs', jobs!.match)).toBe(true);
    expect(isAppSidebarPathActive('/job/abc123', jobs!.match)).toBe(false);
  });
});
