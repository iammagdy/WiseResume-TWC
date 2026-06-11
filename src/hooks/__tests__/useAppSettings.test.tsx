import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppSettings } from '../useAppSettings';

const fetchMock = vi.fn();

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
    vi.stubGlobal('fetch', fetchMock);
  });

  it('loads maintenance mode from the public API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        maintenance_mode: true,
        announcement_enabled: false,
        announcement_banner: null,
        feature_cover_letters: true,
        feature_applications: true,
        feature_ai_studio: true,
        feature_portfolio: true,
        feature_interview_coach: true,
        feature_career_advisor: true,
        maintenance_window_start: null,
        maintenance_window_end: null,
      }),
    });

    const { result } = renderHook(() => useAppSettings(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith('/api/app-settings', expect.objectContaining({
      credentials: 'same-origin',
    }));
    expect(result.current.maintenance_mode).toBe(true);
  });

  it('falls back to defaults when the public API fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useAppSettings(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.maintenance_mode).toBe(false);
    expect(result.current.feature_ai_studio).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('parses string boolean values from the API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        maintenance_mode: 'true',
        announcement_enabled: 'false',
        announcement_banner: 'Scheduled work tonight',
        feature_ai_studio: 'false',
      }),
    });

    const { result } = renderHook(() => useAppSettings(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.maintenance_mode).toBe(true);
    expect(result.current.announcement_enabled).toBe(false);
    expect(result.current.announcement_banner).toBe('Scheduled work tonight');
    expect(result.current.feature_ai_studio).toBe(false);
  });
});
