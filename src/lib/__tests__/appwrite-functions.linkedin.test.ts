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
    $id: 'linkedin-execution',
    status: 'waiting',
    responseStatusCode: 0,
    responseBody: '',
    errors: '',
    ...overrides,
  };
}

describe('appwriteFunctions LinkedIn Optimizer async execution transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. triggers background execution with async=true, polls at 1500ms, and retrieves cached result synchronously', async () => {
    vi.useFakeTimers();
    const mockLinkedInData = {
      headlines: ['Senior Software Engineer | Cloud Architect', 'Tech Lead | React & Node.js'],
      aboutSections: {
        short: 'Experienced engineer building scalable cloud systems.',
        medium: 'Engineering leader with 8+ years building enterprise applications.',
        long: 'Passionate software architect specializing in distributed architectures and modern web ecosystems.',
      },
      experienceRewrites: [{ position: 'Lead Dev', company: 'Acme', linkedin: 'Led core platform revamp.' }],
      suggestedSkills: ['TypeScript', 'React', 'Node.js'],
      keywords: ['Cloud Architecture', 'Full Stack'],
      tips: ['Update your profile headline with your target role.'],
    };

    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: mockLinkedInData }),
      }));

    getExecution.mockResolvedValueOnce(execution({
      status: 'completed',
      responseStatusCode: 200,
    }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: { summary: 'Original resume' }, region: 'global' },
      timeoutMs: 10_000,
    });

    await vi.advanceTimersByTimeAsync(1_499);
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(createExecution.mock.calls[0][0]).toBe('ai-gateway');
    expect(createExecution.mock.calls[0][2]).toBe(true);
    expect(getExecution).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(1);
    expect(getExecution).toHaveBeenCalledWith('ai-gateway', 'linkedin-execution');

    const response = await pending;
    expect(response).toEqual({ data: mockLinkedInData, error: null });

    expect(createExecution).toHaveBeenCalledTimes(2);
    expect(createExecution.mock.calls[1][2]).toBe(false);

    const initialBody = JSON.parse(createExecution.mock.calls[0][1]);
    const resultBody = JSON.parse(createExecution.mock.calls[1][1]);
    expect(resultBody.resume).toEqual(initialBody.resume);
    expect(resultBody.region).toBe(initialBody.region);
    expect(resultBody.featureName).toBe('optimize-for-linkedin');
    expect(resultBody.__headers?.['X-Tailor-Result-Only']).toBeUndefined();
  });

  it('2. continues polling across non-terminal states (waiting -> processing -> completed)', async () => {
    vi.useFakeTimers();
    const mockLinkedInData = { headlines: ['Test Headline'] };

    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: mockLinkedInData }),
      }));

    getExecution
      .mockResolvedValueOnce(execution({ status: 'waiting' }))
      .mockResolvedValueOnce(execution({ status: 'processing' }))
      .mockResolvedValueOnce(execution({ status: 'completed', responseStatusCode: 200 }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: {}, region: 'gcc' },
      timeoutMs: 10_000,
    });

    await vi.advanceTimersByTimeAsync(1_499);
    expect(getExecution).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(getExecution).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(3);

    const response = await pending;
    expect(response).toEqual({ data: mockLinkedInData, error: null });
    expect(createExecution).toHaveBeenCalledTimes(2);
  });

  it('3. terminal failed execution does NOT trigger a second createExecution and returns typed error', async () => {
    vi.useFakeTimers();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValueOnce(execution({
      status: 'failed',
      responseStatusCode: 500,
      errors: 'Model provider rate limit exceeded',
    }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: {}, region: 'global' },
      timeoutMs: 10_000,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({
      code: 'function_runtime_failed',
      status: 503,
    });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(getExecution).toHaveBeenCalledTimes(1);
  });

  it('4. retries result retrieval on 409 request_in_progress within bounded window', async () => {
    vi.useFakeTimers();
    const mockLinkedInData = { headlines: ['Delayed Result Headline'] };

    createExecution
      .mockResolvedValueOnce(execution())
      .mockResolvedValueOnce(execution({
        $id: 'pending-result-execution',
        status: 'completed',
        responseStatusCode: 409,
        responseBody: JSON.stringify({ status: 'error', code: 'request_in_progress' }),
      }))
      .mockResolvedValueOnce(execution({
        $id: 'success-result-execution',
        status: 'completed',
        responseStatusCode: 200,
        responseBody: JSON.stringify({ status: 'success', data: mockLinkedInData }),
      }));

    getExecution.mockResolvedValueOnce(execution({
      status: 'completed',
      responseStatusCode: 200,
    }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: {}, region: 'global' },
      timeoutMs: 10_000,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(1);
    expect(createExecution).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_500);

    const response = await pending;
    expect(response).toEqual({ data: mockLinkedInData, error: null });
    expect(createExecution).toHaveBeenCalledTimes(3);
  });

  it('5. returns request_timeout (504) when polling exceeds configured timeoutMs', async () => {
    vi.useFakeTimers();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValue(execution({ status: 'processing' }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: {}, region: 'global' },
      timeoutMs: 3_000,
    });

    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_500);
    expect(getExecution).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_500);
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({
      code: 'request_timeout',
      status: 504,
      message: 'LinkedIn optimization took too long to finish. Please retry.',
    });
    expect(createExecution).toHaveBeenCalledTimes(1);
  });

  it('6. stops polling immediately on AbortSignal cancellation', async () => {
    const controller = new AbortController();
    createExecution.mockResolvedValueOnce(execution());
    getExecution.mockResolvedValue(execution({ status: 'processing' }));

    const pending = appwriteFunctions.invoke('optimize-for-linkedin', {
      body: { resume: {}, region: 'global' },
      signal: controller.signal,
    });

    while (createExecution.mock.calls.length === 0) await Promise.resolve();
    controller.abort();
    const response = await pending;

    expect(response.data).toBeNull();
    expect(response.error).toMatchObject({
      code: 'request_cancelled',
      status: 499,
      message: 'LinkedIn optimization wait cancelled.',
    });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(getExecution).not.toHaveBeenCalled();
  });

  it('7. regression check: synchronous AI features continue calling createExecution with async=false', async () => {
    createExecution.mockResolvedValueOnce(execution({
      $id: 'sync-execution',
      status: 'completed',
      responseStatusCode: 200,
      responseBody: JSON.stringify({ status: 'success', data: { score: 85 } }),
    }));

    const response = await appwriteFunctions.invoke('career-assessment', {
      body: { answers: ['Developer'] },
    });

    expect(response.data).toEqual({ score: 85 });
    expect(createExecution).toHaveBeenCalledTimes(1);
    expect(createExecution.mock.calls[0][2]).toBe(false);
    expect(getExecution).not.toHaveBeenCalled();
  });
});

