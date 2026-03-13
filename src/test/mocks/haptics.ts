import { vi } from "vitest";

export const haptics = {
  light: vi.fn(),
  medium: vi.fn(),
  heavy: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/lib/haptics", () => ({
  haptics,
}));
