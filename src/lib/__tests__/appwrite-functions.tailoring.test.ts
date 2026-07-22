import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('appwriteFunctions Tailoring execution transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs Tailoring asynchronously, polls to completion, then retrieves the cached result', async () => {
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
      timeoutMs: 5_000,
    });
    await vi.advanceTimersByTimeAsync(750);
    const response = await pending;

    expect(response).toEqual({ data: result, error: null });
    expect(createExecution).toHaveBeenCalledTimes(2);
    expect(createExecution.mock.calls[0][0]).toBe('ai-gateway');
    expect(createExecution.mock.calls[0][2]).toBe(true);
    expect(getExecution).toHaveBeenCalledWith('ai-gateway', 'tailor-execution');
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

  it('returns a classified timeout and does not start a second provider execution', async () => {
    vi.useFakeTimers();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValue(execution({ status: 'processing' }));

    const pending = appwriteFunctions.invoke('tailor-resume', {
      body: { resume: {}, jobDescription: 'A complete role description' },
      timeoutMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({ code: 'request_timeout', status: 504 });
    expect(createExecution).toHaveBeenCalledTimes(1);
  });

  it('stops polling on cancellation without creating a result retrieval execution', async () => {
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
    await vi.advanceTimersByTimeAsync(750);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({ code: 'request_in_progress', status: 409 });
    expect(createExecution).toHaveBeenCalledTimes(2);
  });
});
