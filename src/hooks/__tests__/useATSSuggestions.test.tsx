import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeData } from '@/types/resume';

const mocks = vi.hoisted(() => ({
  checkCredits: vi.fn(),
  incrementUsage: vi.fn(),
  invoke: vi.fn(),
  hasAcceptedPrivacy: vi.fn(),
  requestDisclosure: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/useAICredits', () => ({
  useAICreditsMutations: () => ({
    checkCredits: mocks.checkCredits,
    incrementUsage: { mutate: mocks.incrementUsage },
  }),
}));

vi.mock('@/hooks/useRedactedResume', () => ({
  useRedactedResume: (resume: ResumeData | null) => resume
    ? {
        ...resume,
        contactInfo: {
          ...resume.contactInfo,
          fullName: '[REDACTED]',
          email: '[REDACTED]',
          phone: '[REDACTED]',
        },
      }
    : resume,
}));

vi.mock('@/components/ai/AIPrivacyDisclosure', () => ({
  hasAcceptedAIPrivacy: () => mocks.hasAcceptedPrivacy(),
}));

vi.mock('@/components/ai/AIPrivacyDisclosureProvider', () => ({
  useAIPrivacyDisclosure: () => ({ requestDisclosure: mocks.requestDisclosure }),
}));

vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: { invoke: mocks.invoke },
}));

import { useATSSuggestions } from '@/hooks/useATSSuggestions';

const JOB_DESCRIPTION = 'Seeking a TypeScript engineer with React experience.';

function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    contactInfo: {
      fullName: 'Jane Candidate',
      email: 'jane@example.com',
      phone: '+1 555 0100',
      location: 'Cairo',
    },
    summary: 'TypeScript engineer building reliable products.',
    experience: [],
    education: [],
    skills: ['TypeScript', 'React'],
    certifications: [],
    templateId: 'modern',
    ...overrides,
  };
}

describe('useATSSuggestions deep analysis privacy and caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkCredits.mockResolvedValue(true);
    mocks.hasAcceptedPrivacy.mockReturnValue(true);
    mocks.requestDisclosure.mockResolvedValue(true);
    mocks.invoke.mockResolvedValue({
      data: { improved: 'Improved content', changes: [], suggestions: [] },
      error: null,
    });
  });

  it('does not send resume data when the privacy disclosure is declined', async () => {
    mocks.hasAcceptedPrivacy.mockReturnValue(false);
    mocks.requestDisclosure.mockResolvedValue(false);
    const { result } = renderHook(() => useATSSuggestions(makeResume(), JOB_DESCRIPTION));

    await act(async () => {
      await result.current.fetchDeepSuggestions('summary');
    });

    expect(mocks.requestDisclosure).toHaveBeenCalledTimes(1);
    expect(mocks.checkCredits).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('sends the redacted resume and reuses an unchanged semantic request', async () => {
    const resume = makeResume();
    const { result } = renderHook(() => useATSSuggestions(resume, JOB_DESCRIPTION));

    await act(async () => {
      await result.current.fetchDeepSuggestions('summary');
      await result.current.fetchDeepSuggestions('summary');
    });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    const options = mocks.invoke.mock.calls[0]?.[1] as {
      body: { currentContent: string; context: { resume: ResumeData } };
    };
    expect(options.body.currentContent).toBe(resume.summary);
    expect(options.body.context.resume.contactInfo.fullName).toBe('[REDACTED]');
    expect(options.body.context.resume.contactInfo.email).toBe('[REDACTED]');
  });

  it('invalidates the deep-analysis cache after resume content changes', async () => {
    const initial = makeResume();
    const { result, rerender } = renderHook(
      ({ resume }) => useATSSuggestions(resume, JOB_DESCRIPTION),
      { initialProps: { resume: initial } },
    );

    await act(async () => {
      await result.current.fetchDeepSuggestions('summary');
    });

    const edited = makeResume({ summary: 'Edited TypeScript engineering summary.' });
    rerender({ resume: edited });

    await act(async () => {
      await result.current.fetchDeepSuggestions('summary');
    });

    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    const secondOptions = mocks.invoke.mock.calls[1]?.[1] as {
      body: { currentContent: string };
    };
    expect(secondOptions.body.currentContent).toBe(edited.summary);
  });
});
