import { vi } from 'vitest';

// Directly assign the property on import.meta.env
vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'mock-site-key');

import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PortfolioContactForm } from '../PortfolioContactForm';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import React from 'react';

const turnstileTestWindow = window as Window & {
  simulateTurnstileCallback?: (token: string) => void;
  simulateTurnstileExpiredCallback?: () => void;
  simulateTurnstileErrorCallback?: () => void;
};

// Mock appwriteFunctions
vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('PortfolioContactForm Turnstile UX', () => {
  const defaultProps = {
    username: 'testuser',
    accentColor: '#3b82f6',
    ownerName: 'Test Owner',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global window object turnstile render
    window.turnstile = {
      render: vi.fn((container, params) => {
        // Capture callbacks to simulate them in tests
        turnstileTestWindow.simulateTurnstileCallback = params.callback;
        turnstileTestWindow.simulateTurnstileExpiredCallback = params['expired-callback'];
        turnstileTestWindow.simulateTurnstileErrorCallback = params['error-callback'];
        return 'mock-widget-id';
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    };
  });

  afterEach(() => {
    delete turnstileTestWindow.simulateTurnstileCallback;
    delete turnstileTestWindow.simulateTurnstileExpiredCallback;
    delete turnstileTestWindow.simulateTurnstileErrorCallback;
    delete window.turnstile;
  });

  it('disabled state: send button remains disabled until Turnstile token exists', async () => {
    render(<PortfolioContactForm {...defaultProps} />);
    
    // Fill out form details
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Hi, I\'d love to connect about…'), { target: { value: 'Let\'s connect' } });

    const submitBtn = screen.getByRole('button', { name: /send message/i });
    
    // Token does not exist yet -> should be disabled
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByText('Checking security…').length).toBeGreaterThan(0);
  });

  it('enables submit: token callback enables submit button', async () => {
    render(<PortfolioContactForm {...defaultProps} />);
    
    // Fill out form details
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Hi, I\'d love to connect about…'), { target: { value: 'Let\'s connect' } });

    // Wait for the render mock to capture the callback
    await waitFor(() => {
      expect(turnstileTestWindow.simulateTurnstileCallback).toBeDefined();
    });

    // Simulate successful Turnstile validation callback
    act(() => turnstileTestWindow.simulateTurnstileCallback?.('valid-mock-token'));

    const submitBtn = screen.getByRole('button', { name: /send message/i });
    
    // Wait for button to become enabled
    await waitFor(() => {
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
    });
    expect(screen.queryByText('Checking security…')).toBeNull();
  });

  it('expired callback: clears token and disables submit button again', async () => {
    render(<PortfolioContactForm {...defaultProps} />);
    
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Hi, I\'d love to connect about…'), { target: { value: 'Let\'s connect' } });

    // Wait for the render mock to capture the callbacks
    await waitFor(() => {
      expect(turnstileTestWindow.simulateTurnstileCallback).toBeDefined();
      expect(turnstileTestWindow.simulateTurnstileExpiredCallback).toBeDefined();
    });

    // Simulate success
    act(() => turnstileTestWindow.simulateTurnstileCallback?.('valid-mock-token'));
    
    const submitBtn = screen.getByRole('button', { name: /send message/i });
    await waitFor(() => {
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
    });
    
    // Simulate expired
    act(() => turnstileTestWindow.simulateTurnstileExpiredCallback?.());

    await waitFor(() => {
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });
    expect(screen.getAllByText('Checking security…').length).toBeGreaterThan(0);
  });

  it('error callback: shows retry-friendly error message and retry button', async () => {
    render(<PortfolioContactForm {...defaultProps} />);
    
    // Wait for the render mock to capture the callback
    await waitFor(() => {
      expect(turnstileTestWindow.simulateTurnstileErrorCallback).toBeDefined();
    });

    // Simulate Turnstile load error callback
    act(() => turnstileTestWindow.simulateTurnstileErrorCallback?.());

    // Use findByText/findByRole to automatically wait for state update re-renders
    expect(await screen.findByText('Security check failed. Please try again.')).toBeDefined();
    expect(await screen.findByRole('button', { name: /retry security check/i })).toBeDefined();
  });

  it('submit error handling: backend security failure shows friendly retry message and resets widget without page refresh', async () => {
    // Mock backend rejection on Turnstile validation
    vi.mocked(appwriteFunctions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Security check failed. Please try again.', status: 403 },
    });

    render(<PortfolioContactForm {...defaultProps} />);
    
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Hi, I\'d love to connect about…'), { target: { value: 'Let\'s connect' } });

    // Wait for the render mock to capture the callback
    await waitFor(() => {
      expect(turnstileTestWindow.simulateTurnstileCallback).toBeDefined();
    });

    // Set token
    act(() => turnstileTestWindow.simulateTurnstileCallback?.('bad-mock-token'));

    const submitBtn = screen.getByRole('button', { name: /send message/i });
    
    // Wait for button to be enabled
    await waitFor(() => {
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Assert it calls Turnstile reset
      expect(window.turnstile.reset).toHaveBeenCalled();
      // Error message should NOT require page refresh
      expect(screen.getByText('Security check failed. Please try again.')).toBeDefined();
      // Token should be cleared -> button disabled
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });
  });
});
