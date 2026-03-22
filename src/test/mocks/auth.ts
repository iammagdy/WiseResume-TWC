import { vi } from "vitest";

// Mock @/hooks/useAuth — which wraps AuthContext internally.
// This avoids needing a real AuthProvider in tests.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  })),
}));
