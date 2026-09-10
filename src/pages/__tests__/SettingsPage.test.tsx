import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';

// Mock LocaleProvider
vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string, fallbackOrVars?: string | Record<string, any>, maybeVars?: Record<string, any>) => {
      let str = typeof fallbackOrVars === 'string' ? fallbackOrVars : key;
      const vars = typeof fallbackOrVars === 'object' ? fallbackOrVars : maybeVars;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, String(v));
        });
      }
      return str;
    },
    direction: 'ltr',
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

// Mock useAuth
const mockSignOut = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user_settings_123', email: 'user@example.com' },
    loading: false,
    signOut: mockSignOut,
  }),
}));

// Mock useProfile
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { fullName: 'Alex Morgan', avatarUrl: null, updatedAt: '2026-01-01' },
    updateProfile: vi.fn(),
  }),
}));

// Mock usePlan
vi.mock('@/hooks/usePlan', () => ({
  usePlan: () => ({
    plan: 'pro',
    isPro: true,
    isPremium: false,
    isLoading: false,
  }),
}));

// Mock useResumes
vi.mock('@/hooks/useResumes', () => ({
  useResumes: () => ({
    data: [],
    isLoading: false,
  }),
}));

// Mock useResumeStore
vi.mock('@/store/resumeStore', () => ({
  useResumeStore: () => ({
    currentResumeId: null,
  }),
}));

// Mock useSettingsStore
vi.mock('@/store/settingsStore', () => {
  const store = {
    theme: 'light',
    setTheme: vi.fn(),
    biometricLockEnabled: false,
    biometricLockTimeout: 0,
    setBiometricLockEnabled: vi.fn(),
    setBiometricLockTimeout: vi.fn(),
    pdfDefaults: { pageNumberFormat: 'simple', showBranding: true, paperSize: 'a4', margins: 'normal' },
    setPdfDefaults: vi.fn(),
    showAutoSaveToasts: true,
    aiTipFrequency: 'on-demand',
    selectedTemplate: 'modern',
    byokGeminiKey: null,
    byokOllamaUrl: null,
    aiProvider: 'wiseresume',
  };
  const fn = vi.fn((selector?: (s: typeof store) => unknown) => (selector ? selector(store) : store));
  (fn as any).getState = () => store;
  (fn as any).setState = vi.fn();
  (fn as any).subscribe = vi.fn(() => () => {});
  return { useSettingsStore: fn };
});

// Mock useBiometricLock
vi.mock('@/hooks/useBiometricLock', () => ({
  useBiometricLock: () => ({
    isAvailable: false,
    biometryType: null,
    authenticate: vi.fn().mockResolvedValue(true),
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useChangelogBadge
vi.mock('@/hooks/useChangelogBadge', () => ({
  getChangelog: vi.fn().mockResolvedValue([]),
  useChangelogBadge: () => ({
    unreadCount: 0,
    hasUnread: false,
    markAsRead: vi.fn(),
  }),
}));

// Mock appwrite
vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
    updateDocument: vi.fn().mockResolvedValue({}),
  },
  account: {
    listIdentities: vi.fn().mockResolvedValue({ identities: [] }),
  },
  client: {
    subscribe: () => () => {},
  },
  DATABASE_ID: 'main',
  COLLECTIONS: { profiles: 'profiles' },
  Query: {
    equal: vi.fn(),
    select: vi.fn(),
    limit: vi.fn(),
  },
}));

function renderSettingsPage(initialEntries = ['/settings']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title, search input, and default account tab', () => {
    renderSettingsPage();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search settings...')).toBeInTheDocument();
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('navigates between tabs when tab buttons are clicked', () => {
    renderSettingsPage();

    // Default: Account tab is active
    expect(screen.getByText('Sign Out')).toBeInTheDocument();

    // Click 'AI & Preferences' tab
    const prefsTab = screen.getByRole('button', { name: /ai & preferences/i });
    fireEvent.click(prefsTab);

    // Preferences content should now be visible
    expect(screen.getByText('Theme, font scaling, and default document export settings')).toBeInTheDocument();

    // Click 'Notifications' tab
    const notifsTab = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(notifsTab);

    // Click 'Privacy & Security' tab
    const privacyTab = screen.getByRole('button', { name: /privacy & security/i });
    fireEvent.click(privacyTab);

    // Click 'Help' tab
    const helpTab = screen.getByRole('button', { name: /help/i });
    fireEvent.click(helpTab);
  });

  it('filters sections dynamically when search query is entered', () => {
    renderSettingsPage();

    const searchInput = screen.getByPlaceholderText('Search settings...');
    fireEvent.change(searchInput, { target: { value: 'biometric' } });

    // Should show search results header and privacy section
    expect(screen.getByText(/results for "biometric"/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Privacy & Security' })).toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByText('Clear search');
    fireEvent.click(clearBtn);

    // Should return to tab layout
    expect(screen.getByRole('button', { name: /^Account$/i })).toBeInTheDocument();
  });

  it('shows no results empty state when query matches nothing', () => {
    renderSettingsPage();

    const searchInput = screen.getByPlaceholderText('Search settings...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent-xyz-query' } });

    expect(screen.getByText('No settings found')).toBeInTheDocument();
    expect(screen.getByText('Show all settings')).toBeInTheDocument();
  });
});
