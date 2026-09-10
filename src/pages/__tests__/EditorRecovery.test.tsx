/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditorPage from '../EditorPage';
import { useResumeStoreHydration } from '@/hooks/useResumeStoreHydration';
import { useAuth } from '@/hooks/useAuth';
import { useResume } from '@/hooks/useResumes';
import { mockNavigate } from '@/test/mocks/router';

vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({ t: (_k: string, fb: string) => fb || _k, locale: 'en' }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: vi.fn(({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, { replace });
      return null;
    }),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
    authReady: true,
  })),
}));

vi.mock('@/hooks/useResumeStoreHydration', () => ({
  useResumeStoreHydration: vi.fn(() => true),
}));

vi.mock('@/hooks/useTierGate', () => ({
  useTierGate: () => ({
    gate: vi.fn(),
    triggerGate: vi.fn(),
    dialogOpen: false,
    dialogState: null,
    closeDialog: vi.fn(),
    isPro: true,
    isLoading: false,
  }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    hasSeenAIIntro: true,
    setHasSeenAIIntro: vi.fn(),
    defaultResumeId: null,
  })),
}));

vi.mock('@/store/resumeStore', () => ({
  useResumeStoreHydration: vi.fn(() => true),
  useResumeStore: vi.fn((selector: any) => {
    const state = {
      currentResume: null,
      currentResumeId: null,
      matchScore: 0,
      jobDescription: '',
      selectedTemplate: 'modern',
      isSaving: false,
      lastSavedAt: null,
      setIsSaving: vi.fn(),
      setLastSavedAt: vi.fn(),
      setCurrentResumeId: vi.fn(),
      setJobDescription: vi.fn(),
      setPendingSummaryGeneration: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('@/hooks/useResumes', () => ({
  useResume: vi.fn(() => ({
    data: null,
    error: null,
    refetch: vi.fn(),
  })),
  useResumeMutations: () => ({
    updateResume: { mutate: vi.fn() },
    createResume: { mutate: vi.fn() },
  }),
}));

vi.mock('@/hooks/useResumeShares', () => ({
  useResumeShareMutations: () => ({
    createShare: { mutateAsync: vi.fn() },
  }),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

vi.mock('@/hooks/useEditorHydration', () => ({
  useEditorHydration: () => ({
    localLoadedAtRef: { current: null },
  }),
}));

vi.mock('@/store/offlineSyncStore', () => ({
  useOfflineSyncStore: vi.fn((sel: any) =>
    sel({
      pendingChanges: [],
      addPendingChange: vi.fn(),
    })
  ),
}));

vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    isSyncing: false,
  }),
}));

vi.mock('@/hooks/useEditorSheets', () => ({
  useEditorSheets: () => ({
    open: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(() => false),
    activeSheet: null,
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
  }),
}));

vi.mock('@/hooks/useUndoRedo', () => ({
  useUndoRedo: () => ({
    canUndo: false,
    canRedo: false,
    undoDescription: '',
    redoDescription: '',
    undo: vi.fn(),
    redo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEditorShortcuts', () => ({
  useEditorShortcuts: vi.fn(),
}));

vi.mock('@/hooks/useBackButton', () => ({
  useBackButton: vi.fn(),
}));

vi.mock('@/hooks/useBeforeUnload', () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock('@/hooks/useMobile', () => ({
  useMobile: () => false,
}));

vi.mock('@/hooks/useEditorSectionScores', () => ({
  useEditorSectionScores: () => ({}),
}));

vi.mock('@/hooks/useResumeAnalysis', () => ({
  useResumeAnalysis: () => ({
    isAnalyzing: false,
  }),
}));

vi.mock('@/hooks/useATSSuggestions', () => ({
  useATSSuggestions: () => ({
    getSuggestions: vi.fn(() => []),
    isAnalyzingSection: false,
    fetchDeepSuggestions: vi.fn(),
    scanSummary: null,
    deepResults: {},
    clearDeepResult: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDeepSuggestions', () => ({
  useDeepSuggestions: () => ({
    isAnalyzingSection: false,
    fetchDeepSuggestions: vi.fn(),
    deepResults: {},
    clearDeepResult: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({
    isDirty: () => false,
    interceptNavigate: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

describe('Editor Recovery and Redirection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  it('redirects to /dashboard?action=create when accessed with no resume targetId', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/editor']}>
          <EditorPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard?action=create', {
        replace: true,
        state: undefined,
      });
    });
  });

  it('does not redirect to /dashboard?action=create when a resume ID is present in query parameters', () => {
    vi.mocked(useResume).mockReturnValue({
      data: {
        $id: 'resume-99',
        user_id: 'user-1',
        title: 'Software Engineer',
        contactInfo: { fullName: 'Alex Smith', email: 'alex@example.com' },
        summary: 'Experienced dev',
        experience: [],
        education: [],
        skills: [],
      } as any,
      error: null,
      refetch: vi.fn() as any,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/editor?id=resume-99']}>
          <EditorPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/dashboard?action=create',
      expect.anything()
    );
  });
});
