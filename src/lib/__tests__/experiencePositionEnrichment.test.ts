import { describe, expect, it } from 'vitest';
import { enrichParsedExperience } from '../experiencePositionEnrichment';
import type { Experience } from '@/types/resume';

describe('enrichParsedExperience', () => {
  const rawText = `
EXPERIENCE
Customer Service Representative
Concentrix
Dec 2025 - Apr 2026
Handled customer inquiries.

Senior Cabin Crew
Etihad Airways
Apr 2025 - Dec 2025
`.trim();

  it('fills missing position from the line above company in raw text', () => {
    const aiExperience: Experience[] = [
      {
        id: '1',
        company: 'Concentrix',
        position: '',
        startDate: 'Dec 2025',
        endDate: 'Apr 2026',
        current: false,
        description: '',
        achievements: [],
      },
      {
        id: '2',
        company: 'Etihad Airways',
        position: '',
        startDate: 'Apr 2025',
        endDate: 'Dec 2025',
        current: false,
        description: '',
        achievements: [],
      },
    ];

    const { items, filledCount } = enrichParsedExperience(aiExperience, rawText);
    expect(filledCount).toBeGreaterThanOrEqual(2);
    expect(items[0].position).toMatch(/customer service representative/i);
    expect(items[1].position).toMatch(/cabin crew/i);
  });

  it('reads alternate AI keys on the experience object', () => {
    const exp = {
      id: '1',
      company: 'Acme Corp',
      position: '',
      title: 'Software Engineer',
      startDate: '2020',
      endDate: '2022',
      current: false,
      description: '',
      achievements: [],
    } as Experience & { title: string };

    const { items } = enrichParsedExperience([exp], '');
    expect(items[0].position).toBe('Software Engineer');
  });
});
