import { describe, it, expect } from 'vitest';
import { aiErrorToastMessage, parseAIErrorBody } from '@/lib/aiErrorParser';

describe('aiErrorToastMessage — AI-5 client-side error surfacing', () => {
  it('never echoes a server diagnostic message for the internal code', () => {
    // Even when the server returned a juicy diag string (which used to be
    // surfaced verbatim and could once have contained a Gemini key), the
    // toast must show only the friendly mapped copy.
    const diagWithLeak =
      'Something went wrong: TypeError: failed to fetch ?key=[REDACTED]';
    const out = aiErrorToastMessage({
      code: 'internal',
      status: 500,
      message: diagWithLeak,
    });
    expect(out).not.toContain('TypeError');
    expect(out).not.toContain('Something went wrong');
    expect(out).toBe('AI is temporarily unavailable — please try again in a moment.');
  });

  it('still maps known structured codes to friendly copy', () => {
    expect(
      aiErrorToastMessage({ code: 'rate_limit', status: 429, message: '' }),
    ).toMatch(/too many requests/i);
    expect(
      aiErrorToastMessage({ code: 'payment_required', status: 402, message: '' }),
    ).toMatch(/credits exhausted/i);
    expect(
      aiErrorToastMessage({ code: 'too_many_concurrent_jobs', status: 429, message: '' }),
    ).toMatch(/operations running/i);
  });

  it('parseAIErrorBody preserves the diag in info.message for console-only logging', () => {
    // The diag should NOT reach the toast (test above) but it MUST still be
    // readable on the parsed info object so callers can console.log it for
    // debugging in the browser dev tools.
    const info = parseAIErrorBody(
      { error: 'internal', message: 'Something went wrong: TypeError: boom' },
      0,
    );
    expect(info.code).toBe('internal');
    expect(info.message).toContain('TypeError');
  });
});
