import { describe, expect, it } from 'vitest';

import { getPageTitle } from '@/lib/pageTitles';

describe('page titles', () => {
  it('keeps the Jobs feed distinct from job detail routes', () => {
    expect(getPageTitle('/jobs')).toBe('Jobs');
    expect(getPageTitle('/job/abc123')).toBe('Job Details');
  });
});
