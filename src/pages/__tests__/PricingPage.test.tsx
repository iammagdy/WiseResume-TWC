import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PricingPage from '../PricingPage';

// Mock useLocale
vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
    direction: 'ltr',
    locale: 'en',
    setLocale: vi.fn(),
  }),
}));

// Mock haptics
vi.mock('@/lib/haptics', () => {
  const fn = vi.fn();
  (fn as any).medium = vi.fn();
  (fn as any).light = vi.fn();
  (fn as any).selection = vi.fn();
  return {
    default: fn,
    triggerHaptic: fn,
    haptics: {
      light: vi.fn(),
      medium: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock useAuth
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockIsAuthenticated = false;
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? { id: 'u1' } : null,
  }),
}));

let mockPlan = 'free';
vi.mock('@/hooks/usePlan', () => ({
  usePlan: () => ({
    plan: mockPlan,
    isPro: mockPlan === 'pro',
    isPremium: mockPlan === 'premium',
  }),
}));

describe('PricingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockPlan = 'free';
  });

  it('renders title, pricing tiers, and FAQ section', () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$5')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
  });

  it('navigates to signup for unauthenticated users clicking plan CTA', () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const proBtn = screen.getAllByRole('button', { name: /^get started$/i })[0];
    fireEvent.click(proBtn);

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('disables current plan button and enables higher plan button for authenticated users', () => {
    mockIsAuthenticated = true;
    mockPlan = 'pro';

    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    // Pro is current plan -> should say "Current Plan" and be disabled
    const currentBtn = screen.getByRole('button', { name: /^current plan$/i });
    expect(currentBtn).toBeDisabled();

    // Free is lower tier -> should say "Included" and be disabled
    const includedBtn = screen.getByRole('button', { name: /^included$/i });
    expect(includedBtn).toBeDisabled();

    // Ultimate is higher tier -> should say "Upgrade" and be enabled
    const upgradeBtn = screen.getByRole('button', { name: /^upgrade$/i });
    expect(upgradeBtn).toBeEnabled();
  });

  it('toggles FAQ item on click', () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );

    const faqButton = screen.getByText('Can I try WiseResume for free?');
    fireEvent.click(faqButton);

    expect(screen.getByText('Yes! The Free plan is free forever.')).toBeInTheDocument();
  });
});
