import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppwriteException } from 'appwrite';

const { createExecution, getExecution } = vi.hoisted(() => ({
  createExecution: vi.fn(),
  getExecution: vi.fn(),
}));

vi.mock('@/lib/appwrite', () => ({
  functions: { createExecution, getExecution },
}));

vi.mock('@/lib/appwrite-bridge', () => ({
  shouldRouteToAppwrite: vi.fn(() => true),
}));

vi.mock('@/lib/appwriteJWT', () => ({
  getAppwriteJWT: vi.fn(async () => 'test-jwt'),
}));

vi.mock('@/lib/impersonationStore', () => ({
  isImpersonating: vi.fn(() => false),
  getImpersonationState: vi.fn(() => ({})),
}));

vi.mock('@/lib/devkit/devKitAuth', () => ({
  devKitAuthHeaders: vi.fn(() => ({})),
}));

import { appwriteFunctions } from '@/lib/appwrite-functions';

function execution(overrides: Record<string, unknown> = {}) {
  return {
    $id: 'tailor-execution',
    status: 'waiting',
    responseStatusCode: 0,
    responseBody: '',
    errors: '',
    ...overrides,
  };
}

describe('appwriteFunctions Tailoring execution transport (P2-3A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1, 2, 3 & 10. does not poll before 1500ms, polls at 1500ms, completes successfully, and never calls createExecution for status polls', async () => {
    vi.useFakeTimers();
    const result = { summary: 'Tailored summary' };
    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: result }),
      }));
    getExecution.mockResolvedValueOnce(execution({
      status: 'completed',
      responseStatusCode: 200,
    }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: { summary: 'Original' }, jobDescription: 'A complete role description' },
      timeoutMs: 10_000,
    });

    // Advance 1499ms: getExecution must NOT have been called
    await vi.advanceTimersByTimeAsync(1_499);
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(createExecution.mock.calls[0][0]).toBe('ai-gateway');
    expect(createExecution.mock.calls[0][2]).toBe(true);
    expect(getExecution).not.toHaveBeenCalled();

    // Advance remaining 1ms to 1500ms: first poll occurs
    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(1);
    expect(getExecution).toHaveBeenCalledWith('ai-gateway', 'tailor-execution');

    const response = await pending;
    expect(response).toEqual({ data: result, error: null });

    // Status poll uses getExecution, NOT createExecution
    expect(createExecution).toHaveBeenCalledTimes(2);
    expect(createExecution.mock.calls[1][2]).toBe(false);

    const initialBody = JSON.parse(createExecution.mock.calls[0][1]);
    const resultBody = JSON.parse(createExecution.mock.calls[1][1]);
    expect(resultBody.resume).toEqual(initialBody.resume);
    expect(resultBody.jobDescription).toBe(initialBody.jobDescription);
    expect(resultBody.__headers['X-Idempotency-Key'])
      .toBe(initialBody.__headers['X-Idempotency-Key']);
    expect(resultBody.__headers).toMatchObject({
      'X-Tailor-Result-Only': 'true',
      'X-Tailor-Execution-Status': 'completed',
      'X-Tailor-Execution-Http-Status': '200',
    });
  });

  it('4. repeated non-terminal states continue polling at 1500ms intervals', async () => {
    vi.useFakeTimers();
    const result = { summary: 'Multi-poll summary' };
    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: result }),
      }));

    getExecution
      .mockResolvedValueOnce(execution({ status: 'processing' }))
      .mockResolvedValueOnce(execution({ status: 'processing' }))
      .mockResolvedValueOnce(execution({ status: 'completed', responseStatusCode: 200 }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      timeoutMs: 10_000,
    });

    // Before 1500ms: 0 polls
    await vi.advanceTimersByTimeAsync(1_499);
    expect(getExecution).toHaveBeenCalledTimes(0);

    // Poll 1 at 1500ms
    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(1);

    // Before 3000ms: still 1 poll
    await vi.advanceTimersByTimeAsync(1_499);
    expect(getExecution).toHaveBeenCalledTimes(1);

    // Poll 2 at 3000ms
    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(2);

    // Before 4500ms: still 2 polls
    await vi.advanceTimersByTimeAsync(1_499);
    expect(getExecution).toHaveBeenCalledTimes(2);

    // Poll 3 at 4500ms
    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(3);

    const response = await pending;
    expect(response).toEqual({ data: result, error: null });
    expect(createExecution).toHaveBeenCalledTimes(2);
  });

  it('5. failed terminal execution remains handled correctly without starting another provider call', async () => {
    vi.useFakeTimers();
    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'failed-result-execution',
        status: 'completed',
        responseStatusCode: 503,
        responseBody: JSON.stringify({
          status: 'error',
          code: 'function_runtime_failed',
          message: 'Tailoring stopped before producing a usable result. Please retry.',
        }),
      }));
    getExecution.mockResolvedValueOnce(execution({
      status: 'failed',
      responseStatusCode: 500,
      errors: 'Provider rate limit exceeded',
    }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      timeoutMs: 10_000,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({
      code: 'timeout',
      status: 503,
    });
    expect(createExecution).toHaveBeenCalledTimes(2);
    expect(createExecution.mock.calls[1][2]).toBe(false);
    expect(getExecution).toHaveBeenCalledTimes(1);
  });

  it('6. returns a classified timeout bounded at configured timeout', async () => {
    vi.useFakeTimers();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValue(execution({ status: 'processing' }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      timeoutMs: 3_000,
    });

    // Advance 1500ms: 1st poll
    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(1);

    // Advance another 1500ms (total 3000ms): 2nd poll
    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(2);

    // Advance to 3rd poll boundary (4500ms >= 3000ms timeout)
    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({ code: 'request_timeout', status: 504 });
    expect(createExecution).toHaveBeenCalledTimes(1);
  });

  it('7. stops polling on cancellation promptly without creating a result retrieval execution', async () => {
    const controller = new AbortController();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValue(execution({ status: 'processing' }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      signal: controller.signal,
    });
    while (createExecution.mock.calls.length === 0) await Promise.resolve();
    controller.abort();
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({ code: 'request_cancelled', status: 499 });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(getExecution).not.toHaveBeenCalled();
  });

  it('surfaces an active duplicate as in progress without starting another provider call', async () => {
    vi.useFakeTimers();
    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'result-execution',
        status: 'completed',
        responseStatusCode: 409,
        responseBody: JSON.stringify({
          status: 'error',
          code: 'request_in_progress',
          message: 'Tailoring is still processing.',
        }),
      }));
    getExecution.mockResolvedValueOnce(execution({
      status: 'completed',
      responseStatusCode: 409,
    }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      timeoutMs: 5_000,
    });
    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({ code: 'request_in_progress', status: 409 });
    expect(createExecution).toHaveBeenCalledTimes(2);
  });

  it('8 & 9. retrieves the cached result when Appwrite denies browser execution-status polling (401/403/404)', async () => {
    vi.useFakeTimers();
    const result = { summary: 'Recovered tailored summary' };
    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'pending-result-execution',
        status: 'completed',
        responseStatusCode: 409,
        responseBody: JSON.stringify({ status: 'error', code: 'request_in_progress' }),
      }))
      .mockResolvedValueOnce(execution({
        $id: 'successful-result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: result }),
      }));
    getExecution.mockRejectedValueOnce(new AppwriteException('Execution not accessible.', 401));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: { summary: 'Original' }, jobDescription: 'A complete role description' },
      timeoutMs: 20_000,
    });

    // Advance 1500ms: getExecution called and rejects with 401
    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response).toEqual({ data: result, error: null });
    expect(getExecution).toHaveBeenCalledTimes(1);
    expect(createExecution).toHaveBeenCalledTimes(3);
    expect(createExecution.mock.calls[0][2]).toBe(true);
    expect(createExecution.mock.calls.slice(1).every((call) => call[2] === false)).toBe(true);
    const resultBody = JSON.parse(createExecution.mock.calls[1][1]);
    expect(resultBody.__headers).toMatchObject({
      'X-Tailor-Result-Only': 'true',
      'X-Tailor-Result-Wait-Ms': '8000',
    });
  });

  it('returns request_cancelled (499) and does not surface result if signal aborts while fallback createExecution is in-flight', async () => {
    vi.useFakeTimers();
    const result = { summary: 'Late result that should be dropped' };
    const controller = new AbortController();

    let resolveFallbackExecution!: (val: unknown) => void;
    const delayedFallbackPromise = new Promise((resolve) => {
      resolveFallbackExecution = resolve;
    });

    createExecution
      .mockResolvedValueOnce(execution())
      .mockImplementationOnce(() => delayedFallbackPromise);

    getExecution.mockRejectedValueOnce(new AppwriteException('Execution not accessible.', 401));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: { summary: 'Original' }, jobDescription: 'A complete role description' },
      timeoutMs: 20_000,
      signal: controller.signal,
    });

    // Advance 1500ms: getExecution is called and rejects with 401
    await vi.advanceTimersByTimeAsync(1_500);

    // Fallback createExecution is now in flight
    expect(createExecution).toHaveBeenCalledTimes(2);

    // User cancels while fallback createExecution is in flight
    controller.abort();

    // Now late response resolves successfully
    resolveFallbackExecution(execution({
      $id: 'successful-result-execution',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({ status: 'success', data: result }),
    }));

    const response = await pending;

    // Must return request_cancelled and NOT surface data
    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({
      code: 'request_cancelled',
      status: 499,
    });
  });
});
