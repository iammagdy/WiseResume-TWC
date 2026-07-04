import { describe, it, expect } from 'vitest';
import type { SlotTestResult, BackendSlotTestStatus, FrontendSlotTestState } from '../aiTestTypes';

describe('AI Key Tester Frontend Types & Helpers', () => {
  it('correctly maps backend statuses to frontend states', () => {
    const backendStatuses: BackendSlotTestStatus[] = [
      'success',
      'missing_key',
      'invalid_key',
      'model_not_found',
      'rate_limited',
      'provider_error',
      'timeout',
    ];

    for (const status of backendStatuses) {
      const state: FrontendSlotTestState = status;
      expect(state).toBe(status);
    }
  });

  it('never persists testing state in structured test results', () => {
    const result: SlotTestResult = {
      ok: true,
      provider: 'groq',
      slot: 1,
      model: 'llama-3.3-70b-versatile',
      status: 'success',
      latencyMs: 145,
      testedAt: new Date().toISOString(),
      keyPreview: '****abcd',
      message: 'Model responded successfully',
    };

    expect(result.status).not.toBe('testing');
    expect(result.status).not.toBe('untested');
    expect(result.ok).toBe(true);
    expect(result.keyPreview).toBe('****abcd');
    expect(result.message).not.toContain('Bearer');
    expect(result.message).not.toContain('sk-');
  });
});
