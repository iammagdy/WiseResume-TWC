import { vi } from "vitest";

// Mock @/lib/agenticChat — used by useAgenticChat hook.
// sendChatMessage resolves to a mock assistant reply by default.
const mockSendChatMessage = vi.fn().mockResolvedValue({
  role: "assistant",
  content: "Mock AI response",
});

vi.mock("@/lib/agenticChat", () => ({
  sendChatMessage: mockSendChatMessage,
  createChatSession: vi.fn().mockResolvedValue({ sessionId: "mock-session" }),
}));

export { mockSendChatMessage };
