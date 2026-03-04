import { render } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the supabase client — vi.hoisted ensures these exist before vi.mock runs
const { mockOnAuthStateChange, mockGetSession } = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  mockGetSession: vi.fn(() => Promise.resolve({
    data: { session: null },
    error: null,
  })),
}));

vi.mock('@/integrations/supabase/safeClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => mockOnAuthStateChange(),
      getSession: () => mockGetSession(),
      signOut: vi.fn(),
    },
  },
}));

const TestComponent = () => {
  useAuth();
  return <div>Test</div>;
};

describe('useAuth Performance Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onAuthStateChange only ONCE when multiple components use useAuth', async () => {
    render(
      <AuthProvider>
        <TestComponent />
        <TestComponent />
        <TestComponent />
      </AuthProvider>
    );

    // Optimized expectation: onAuthStateChange is called ONLY once
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });
});
