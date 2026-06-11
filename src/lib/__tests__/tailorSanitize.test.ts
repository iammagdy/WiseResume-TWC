import { describe, expect, it } from 'vitest';

import { dedupeAchievements, mergeSkillsForTailor } from '@/lib/tailorSanitize';

describe('dedupeAchievements', () => {
  it('removes near-duplicate bullets', () => {
    const bullets = [
      'Improved customer satisfaction ratings by 25% through effective team leadership and process improvement',
      'Improved customer satisfaction ratings by 20% through effective team leadership and process improvement',
      'Managed a team of 14 representatives',
    ];
    expect(dedupeAchievements(bullets)).toHaveLength(2);
  });
});

describe('mergeSkillsForTailor', () => {
  it('keeps original skills the AI dropped', () => {
    const merged = mergeSkillsForTailor(
      ['React', 'Python', 'Docker'],
      ['Customer Service', 'React'],
    );
    expect(merged).toEqual(['Customer Service', 'React', 'Python', 'Docker']);
  });
});
