import { vi } from 'vitest';

// Directly assign the property on import.meta.env
(import.meta.env as any).VITE_TURNSTILE_SITE_KEY = 'mock-site-key';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AIRoutingSwitcher } from '../AIRoutingSwitcher';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Mock appwriteFunctions
vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: vi.fn(),
  },
}));

// Mock account
vi.mock('@/lib/appwrite', () => ({
  account: {
    createJWT: vi.fn().mockResolvedValue({ jwt: 'mock-jwt' }),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('AIRoutingSwitcher testRoute Wrapper & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <TooltipProvider>
        <AIRoutingSwitcher />
      </TooltipProvider>
    );
  };

  it('renders correctly and loads routing config', async () => {
    vi.mocked(appwriteFunctions.invoke).mockResolvedValue({
      data: {
        configs: [
          { $id: 'config1', feature_id: 'resume-section-ai', provider: 'deepseek:1', model: 'deepseek-chat' }
        ]
      },
      error: null,
    });

    renderComponent();
    expect(screen.getByText(/Fetching AI Global Config/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });
  });

  it('handles route test success when status is ok', async () => {
    vi.mocked(appwriteFunctions.invoke)
      // First call for list-routing-config
      .mockResolvedValueOnce({
        data: { configs: [] },
        error: null,
      })
      // Second call for issue-test-nonce
      .mockResolvedValueOnce({
        data: { nonce: 'mock-nonce' },
        error: null,
      })
      // Third call for ai-gateway testRoute
      .mockResolvedValueOnce({
        data: {
          status: 'ok',
          provider: 'deepseek',
          model: 'deepseek-chat',
          preview: 'ROUTE_OK'
        },
        error: null,
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });

    // Find the test button for the first tool (e.g. Section Enhance)
    const testButtons = screen.getAllByRole('button', { name: /test/i });
    expect(testButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Route OK ✓/i)).toBeInTheDocument();
      expect(screen.getByText(/\[deepseek\] deepseek-chat/i)).toBeInTheDocument();
    });
  });

  it('handles route test success when adminTest is true', async () => {
    vi.mocked(appwriteFunctions.invoke)
      // First call for list-routing-config
      .mockResolvedValueOnce({
        data: { configs: [] },
        error: null,
      })
      // Second call for issue-test-nonce
      .mockResolvedValueOnce({
        data: { nonce: 'mock-nonce' },
        error: null,
      })
      // Third call for ai-gateway testRoute
      .mockResolvedValueOnce({
        data: {
          adminTest: true,
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          preview: 'ROUTE_OK'
        },
        error: null,
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });

    const testButtons = screen.getAllByRole('button', { name: /test/i });
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Route OK ✓/i)).toBeInTheDocument();
      expect(screen.getByText(/\[groq\] llama-3.3-70b-versatile/i)).toBeInTheDocument();
    });
  });

  it('handles route test error object cleanly and renders it as string without crashing', async () => {
    const mockError = {
      message: 'Failed to test route',
      status: 502,
      raw: { responseBody: 'Bad gateway payload' }
    };

    vi.mocked(appwriteFunctions.invoke)
      .mockResolvedValueOnce({
        data: { configs: [] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { nonce: 'mock-nonce' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });

    const testButtons = screen.getAllByRole('button', { name: /test/i });
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Failed to test route/i)).toBeInTheDocument();
      expect(screen.getByText(/HTTP 502/i)).toBeInTheDocument();
    });
  });
});
