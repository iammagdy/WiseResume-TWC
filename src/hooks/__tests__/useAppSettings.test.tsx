import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppwriteException } from 'appwrite';
import { useAppSettings } from '../useAppSettings';

const listDocuments = vi.fn();

vi.mock('@/lib/appwrite', () => ({
  DATABASE_ID: 'main',
  Query: {
    limit: (value: number) => ({ type: 'limit', value }),
  },
  databases: {
    listDocuments: (...args: unknown[]) => listDocuments(...args),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAppSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back quietly when app settings are not readable for the current user', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    listDocuments.mockRejectedValueOnce(
      new AppwriteException('Not authorized', 401, 'general_unauthorized_scope'),
    );

    const { result } = renderHook(() => useAppSettings(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.maintenance_mode).toBe(false);
    expect(result.current.feature_ai_studio).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('still warns for unexpected settings failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    listDocuments.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useAppSettings(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.announcement_enabled).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[useAppSettings] Could not load settings:',
      expect.any(Error),
    );
  });
});
