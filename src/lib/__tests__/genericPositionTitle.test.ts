import { describe, expect, it } from 'vitest';
import { isGenericPositionTitle, sanitizeExperiencePositions } from '../genericPositionTitle';

describe('genericPositionTitle', () => {
  it('flags common AI placeholders', () => {
    expect(isGenericPositionTitle('Position 1')).toBe(true);
    expect(isGenericPositionTitle('Job 2')).toBe(true);
    expect(isGenericPositionTitle('Role')).toBe(true);
    expect(isGenericPositionTitle('Senior Engineer')).toBe(false);
  });

  it('strips generic titles and tries description fallback', () => {
    const { items, hadGenericTitles } = sanitizeExperiencePositions([
      {
        position: 'Position 1',
        company: 'Acme',
        description: 'Product Manager\nLed roadmap.',
      },
    ]);
    expect(hadGenericTitles).toBe(true);
    expect(items[0].position).toBe('Product Manager');
  });
});
