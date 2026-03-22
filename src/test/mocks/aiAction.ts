import { vi } from "vitest";

// Mock @/hooks/useAIAction — the universal AI action wrapper.
// execute() resolves to null by default; override with mockResolvedValueOnce in tests.
const mockExecute = vi.fn().mockResolvedValue(null);

vi.mock("@/hooks/useAIAction", () => ({
  useAIAction: vi.fn(() => ({
    execute: mockExecute,
    cost: 1,
  })),
}));

export { mockExecute };
