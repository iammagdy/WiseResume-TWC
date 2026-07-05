import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import AuthPage from '../AuthPage';
import AuthCallbackPage from '../AuthCallbackPage';

const {
  mockClearAllPersistedCaches,
  mockClearAllCachedScores,
  mockClearAllEditorSessions,
  mockClearPlanCache,
} = vi.hoisted(() => ({
  mockClearAllPersistedCaches: vi.fn(),
  mockClearAllCachedScores: vi.fn(),
  mockClearAllEditorSessions: vi.fn(),
  mockClearPlanCache: vi.fn(),
}));

vi.mock('@/lib/persistedQueryCache', () => ({
  clearAllPersistedCaches: mockClearAllPersistedCaches,
}));
vi.mock('@/hooks/useResumeScore', () => ({
  clearAllCachedScores: mockClearAllCachedScores,
}));
vi.mock('@/lib/editorSession', () => ({
  clearAllEditorSessions: mockClearAllEditorSessions,
}));
vi.mock('@/lib/planCache', () => ({
  clearPlanCache: mockClearPlanCache,
}));

const mockCreateEmailPasswordSession = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/lib/appwrite', () => ({
  account: {
    createEmailPasswordSession: (...args: any[]) => mockCreateEmailPasswordSession(...args),
    create: (...args: any[]) => mockCreate(...args),
    get: vi.fn().mockResolvedValue({ $id: 'user-abc' }),
  },
  ID: {
    unique: () => 'unique-id',
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    loading: false,
    refreshSession: vi.fn().mockResolvedValue({ id: 'user-abc', email: 'user@example.com', name: 'John Doe' }),
  })),
}));

vi.mock('@/lib/profileSeed', () => ({
  upsertProfileIdentity: vi.fn().mockResolvedValue('profile-123'),
}));

describe('Auth Cache Clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears caches during successful OAuth callback execution', async () => {
    renderWithProviders(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockClearAllPersistedCaches).toHaveBeenCalled();
      expect(mockClearAllCachedScores).toHaveBeenCalled();
      expect(mockClearAllEditorSessions).toHaveBeenCalled();
      expect(mockClearPlanCache).toHaveBeenCalled();
    });
  });
});
