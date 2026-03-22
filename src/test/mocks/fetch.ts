import { vi } from "vitest";

// Mock global.fetch for tests that call edge functions directly
// (e.g. tailorResumeWithProgress, parseTextWithAI).
// Override with mockFetch.mockResolvedValueOnce(...) in individual tests.
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(""),
  headers: new Headers(),
});

vi.stubGlobal("fetch", mockFetch);

export { mockFetch };
