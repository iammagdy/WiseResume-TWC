import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { toast } from 'sonner';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useResumeStore } from '@/store/resumeStore';
import { LinkedInOptimizerSheet } from '../LinkedInOptimizerSheet';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: vi.fn(),
  },
}));

vi.mock('@/hooks/useAIAction', () => ({
  useAIAction: vi.fn(() => ({
    execute: async (action: () => Promise<unknown>, opts?: { silent?: boolean }) => {
      try {
        return await action();
      } catch (err) {
        if (opts?.silent) throw err;
        return null;
      }
    },
  })),
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: vi.fn(() => ({ isPro: true, isPremium: false, isLoading: false, plan: 'pro' })),
}));

vi.mock('@/lib/activityTracker', () => ({
  activityTracker: {
    setActiveFeature: vi.fn(),
  },
}));

vi.mock('@/lib/haptics', () => ({
  haptics: {
    medium: vi.fn(),
    success: vi.fn(),
  },
}));

describe('LinkedInOptimizerSheet cancellation and error toast semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useResumeStore.setState({
      currentResume: {
        $id: 'resume-test',
        title: 'Senior Product Manager',
        contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
        summary: 'Product leader with 10 years experience',
        experience: [{ company: 'Acme Corp', position: 'Lead PM', description: 'Led growth' }],
        education: [],
        skills: ['Product Strategy'],
        certifications: [],
      } as any,
    });
  });

  it('does NOT emit an AI error toast when drawer is closed / unmounted during active optimization', async () => {
    let capturedSignal: AbortSignal | undefined;
    (appwriteFunctions.invoke as any).mockImplementation(
      (_fn: string, options?: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal;
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            const err = new Error('LinkedIn optimization wait cancelled.') as any;
            err.code = 'request_cancelled';
            err.status = 499;
            reject(err);
          });
        });
      },
    );

    const onOpenChange = vi.fn();
    const { rerender } = renderWithProviders(
      <LinkedInOptimizerSheet open={true} onOpenChange={onOpenChange} />,
    );

    const generateBtn = screen.getByRole('button', { name: /Generate LinkedIn Content/i });
    fireEvent.click(generateBtn);

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    // Close the drawer while request is in flight
    rerender(<LinkedInOptimizerSheet open={false} onOpenChange={onOpenChange} />);

    expect(capturedSignal?.aborted).toBe(true);

    // Wait for microtasks to settle
    await waitFor(() => {
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  it('emits exactly ONE error toast on genuine failure', async () => {
    (appwriteFunctions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: { code: 'function_runtime_failed', status: 503, message: 'Server unavailable' },
    });

    renderWithProviders(
      <LinkedInOptimizerSheet open={true} onOpenChange={vi.fn()} />,
    );

    const generateBtn = screen.getByRole('button', { name: /Generate LinkedIn Content/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('Failed to optimize. Please try again.');
    });
  });
});
