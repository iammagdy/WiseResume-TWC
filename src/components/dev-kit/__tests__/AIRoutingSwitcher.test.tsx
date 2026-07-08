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

    // Find the feature-row test buttons by exact text content
    // These are the small native <button> elements that trigger testRoute()
    const testButtons = await waitFor(() => {
      const btns = screen.getAllByText('test');
      expect(btns.length).toBeGreaterThan(0);
      return btns;
    });

    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Route OK ✓/i)).toBeInTheDocument();
      const actualEl = screen.getByText((content, element) => {
        return element?.tagName?.toLowerCase() === 'p' &&
          /Actual:\s*\[deepseek\]\s*deepseek-chat/i.test(element.textContent || '');
      });
      expect(actualEl).toBeInTheDocument();
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

    const testButtons = await waitFor(() => {
      const btns = screen.getAllByText('test');
      expect(btns.length).toBeGreaterThan(0);
      return btns;
    });
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Route OK ✓/i)).toBeInTheDocument();
      const actualEl = screen.getByText((content, element) => {
        return element?.tagName?.toLowerCase() === 'p' &&
          /Actual:\s*\[groq\]\s*llama-3.3-70b-versatile/i.test(element.textContent || '');
      });
      expect(actualEl).toBeInTheDocument();
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

    const testButtons = await waitFor(() => {
      const btns = screen.getAllByText('test');
      expect(btns.length).toBeGreaterThan(0);
      return btns;
    });
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Failed to test route/i)).toBeInTheDocument();
      expect(screen.getByText(/HTTP 502/i)).toBeInTheDocument();
    });
  });

  it('triggers dirty state, shows Save bar and disables test button when changing provider', async () => {
    vi.mocked(appwriteFunctions.invoke).mockResolvedValue({
      data: { configs: [] },
      error: null,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });

    // 1. Initial state check: no unsaved changes, Save buttons are not active or not in document
    expect(screen.queryByText(/unsaved change/i)).not.toBeInTheDocument();

    // Find the test button for the first row (resume-section-ai)
    const testBtns = screen.getAllByRole('button', { name: 'test' });
    expect(testBtns[0]).not.toBeDisabled();

    // 2. Change provider override (click GROQ button on the first row)
    const groqBtns = screen.getAllByRole('button', { name: /Groq/i });
    fireEvent.click(groqBtns[0]);

    // 3. Assert dirty state is triggered:
    // - "Save All Changes" sticky bar should appear
    // - Test button text should change to "save first" and become disabled
    await waitFor(() => {
      expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();
    });

    const saveFirstBtns = screen.getAllByRole('button', { name: 'save first' });
    expect(saveFirstBtns[0]).toBeDisabled();
  });

  it('triggers dirty state when changing model of default provider, calls create-routing-config on saveAll, and clears dirty state on refetch', async () => {
    // Mock sequential calls:
    // 1. Initial list-routing-config -> empty list
    // 2. create-routing-config on saveAll -> success
    // 3. Reload list-routing-config -> returns the saved override
    vi.mocked(appwriteFunctions.invoke)
      .mockResolvedValueOnce({
        data: { configs: [] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          config: {
            $id: 'new-override-id',
            feature_id: 'resume-section-ai',
            provider: 'deepseek',
            model: 'deepseek-reasoner'
          }
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          configs: [
            { $id: 'new-override-id', feature_id: 'resume-section-ai', provider: 'deepseek', model: 'deepseek-reasoner' }
          ]
        },
        error: null,
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI Routing \(AI Tools Map\)/i)).toBeInTheDocument();
    });

    // 1. Initially, the model select dropdown is NOT visible because hasOverride is false (uses default route)
    // To show the model dropdown, click the default provider button (DEEPSEEK) to create local override state
    const deepseekBtns = screen.getAllByRole('button', { name: /DeepSeek/i });
    fireEvent.click(deepseekBtns[0]);

    // 2. Now hasOverride is true, so the model dropdown is rendered
    const modelDropdowns = await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      return selects;
    });

    // 3. Change model to deepseek-reasoner
    fireEvent.change(modelDropdowns[0], { target: { value: 'deepseek-reasoner' } });

    // 4. Assert dirty state is triggered:
    await waitFor(() => {
      expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();
    });

    // 5. Click Save All Changes button in the bottom sticky bar
    const saveButton = screen.getByRole('button', { name: /Save All Changes/i });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    // 6. Assert saveAll makes the correct create call, then reload clears dirty state
    await waitFor(() => {
      // Check that the save call went through
      expect(appwriteFunctions.invoke).toHaveBeenCalledWith('admin-devkit-data', expect.objectContaining({
        body: expect.objectContaining({
          action: 'create-routing-config',
          featureId: 'resume-section-ai',
          provider: 'deepseek',
          model: 'deepseek-reasoner'
        })
      }));
    });

    // 7. Verify dirty state clears and the test button is back to "test" and clickable
    await waitFor(() => {
      expect(screen.queryByText(/unsaved change/i)).not.toBeInTheDocument();
    });

    const testBtns = screen.getAllByRole('button', { name: 'test' });
    expect(testBtns[0]).not.toBeDisabled();
  });
});
