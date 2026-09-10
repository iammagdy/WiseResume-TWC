/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIEnhanceDialog } from '../AIEnhanceDialog';
import { useAICredits } from '@/hooks/useAICredits';

vi.mock('@/hooks/useAICredits', () => ({
  useAICredits: vi.fn(),
}));

vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string, fallback?: string, options?: Record<string, any>) => {
      let text = fallback || key;
      if (options) {
        Object.entries(options).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }
      return text;
    },
    locale: 'en',
  }),
}));

vi.mock('@/lib/haptics', () => ({
  haptics: {
    selection: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
  },
}));

describe('AIEnhanceDialog AI Credit Transparency', () => {
  const defaultProps = {
    isOpen: true,
    isEnhancing: false,
    original: 'Original text for bullet point',
    improved: 'Enhanced bullet point text with impact',
    onApply: vi.fn(),
    onDiscard: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays finite remaining allowance badge (e.g. 3 of 5 daily AI actions remaining)', () => {
    vi.mocked(useAICredits).mockReturnValue({
      data: {
        daily_usage: 2,
        daily_limit: 5,
        allowed: true,
      },
      isLoading: false,
    } as any);

    render(<AIEnhanceDialog {...defaultProps} />);

    expect(screen.getByText('3 of 5 daily AI actions remaining')).toBeInTheDocument();
  });

  it('displays zero remaining badge when daily quota is exhausted (0 of 5 remaining)', () => {
    vi.mocked(useAICredits).mockReturnValue({
      data: {
        daily_usage: 5,
        daily_limit: 5,
        allowed: false,
      },
      isLoading: false,
    } as any);

    render(<AIEnhanceDialog {...defaultProps} />);

    expect(screen.getByText('0 of 5 daily AI actions remaining')).toBeInTheDocument();
  });

  it('displays "Unlimited AI actions today" for users with infinite daily limit', () => {
    vi.mocked(useAICredits).mockReturnValue({
      data: {
        daily_usage: 14,
        daily_limit: Infinity,
        allowed: true,
      },
      isLoading: false,
    } as any);

    render(<AIEnhanceDialog {...defaultProps} />);

    expect(screen.getByText('Unlimited AI actions today')).toBeInTheDocument();
  });

  it('handles null/loading credits safely without crashing or rendering badge', () => {
    vi.mocked(useAICredits).mockReturnValue({
      data: null,
      isLoading: true,
    } as any);

    const { container } = render(<AIEnhanceDialog {...defaultProps} />);

    expect(container).toBeInTheDocument();
    expect(screen.queryByText(/daily AI actions remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unlimited AI actions today/i)).not.toBeInTheDocument();
  });

  it('does not consume credits or trigger AI actions purely on dialog open/render', () => {
    const consumeMock = vi.fn();
    vi.mocked(useAICredits).mockReturnValue({
      data: {
        daily_usage: 1,
        daily_limit: 5,
        allowed: true,
      },
      isLoading: false,
      consumeCredit: consumeMock,
    } as any);

    render(<AIEnhanceDialog {...defaultProps} />);

    expect(consumeMock).not.toHaveBeenCalled();
    expect(defaultProps.onApply).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });
});
