import { describe, expect, it } from 'vitest';
import { formatTailoringHubDate } from './TailoringHubLanding';

describe('Tailoring Hub date locale', () => {
  it('uses the application locale instead of the browser locale', () => {
    const date = '2026-07-02T12:00:00.000Z';

    expect(formatTailoringHubDate(date, 'en')).toBe('Jul 2, 2026');
    expect(formatTailoringHubDate(date, 'ar')).toMatch(/[\u0600-\u06ff]/);
  });
});
