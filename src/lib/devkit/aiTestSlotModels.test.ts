import { describe, expect, it } from 'vitest';
import { AI_KEY_SLOT_MAP } from './aiTestSlotModels';

describe('AI_KEY_SLOT_MAP', () => {
  it('matches the real 10-slot provider inventory', () => {
    expect(AI_KEY_SLOT_MAP.openrouter).toEqual([1, 2, 3]);
    expect(AI_KEY_SLOT_MAP.groq).toEqual([1, 2, 3]);
    expect(AI_KEY_SLOT_MAP.nvidia).toEqual([1, 2, 3]);
    expect(AI_KEY_SLOT_MAP.deepseek).toEqual([1]);

    const totalCards = Object.values(AI_KEY_SLOT_MAP).reduce((sum, slots) => sum + slots.length, 0);
    expect(totalCards).toBe(10);
  });
});
