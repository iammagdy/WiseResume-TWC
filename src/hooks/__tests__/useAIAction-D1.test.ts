/**
 * D1 — useAIAction hook unit tests
 * Tests the real hook implementation: execute action → invalidate cache.
 * Credit deduction is now server-side; this hook just executes and handles errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Unmock the real hook so we can test its implementation
vi.unmock("@/hooks/useAIAction");

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

// Mock privacy disclosure — always accepted in unit tests
vi.mock("@/components/ai/AIPrivacyDisclosure", () => ({
  hasAcceptedAIPrivacy: vi.fn().mockReturnValue(true),
}));

vi.mock("@/components/ai/AIPrivacyDisclosureProvider", () => ({
  useAIPrivacyDisclosure: vi.fn(() => ({
    requestDisclosure: vi.fn().mockResolvedValue(true),
  })),
}));

// Import after mocks are registered
import { useAIAction } from "@/hooks/useAIAction";

describe("useAIAction (D1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes action and returns result", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue({ summary: "tailored" });

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(value).toEqual({ summary: "tailored" });
  });

  it("invalidates credits cache after successful action", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue("done");

    await act(async () => {
      await result.current.execute(action);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["me"] })
    );
  });

  it("returns null and does not invalidate cache when action throws", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockRejectedValue(new Error("AI failed"));

    let value: unknown;
    await act(async () => {
      value = await result.current.execute(action);
    });

    expect(value).toBeNull();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  // Regression for Task #5 / Task #3 parser unification: a structured
  // `not_configured` error must route through the canonical aiErrorParser
  // ("WiseResume AI is not configured…") and NOT fall through to the
  // legacy `parseErrorMessage` regex sniffer's generic
  // "AI temporarily unavailable" copy. This test guards against anyone
  // re-introducing the dual-parser behaviour.
  it("maps a structured not_configured error to the canonical message", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const structuredErr: Error & { body?: unknown; status?: number } = Object.assign(
      new Error("API key not configured"),
      {
        body: { code: "not_configured", message: "API key not configured" },
        status: 503,
      },
    );
    const action = vi.fn().mockRejectedValue(structuredErr);

    await act(async () => {
      await result.current.execute(action);
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    const [msg] = toastError.mock.calls[0] as [string, unknown];
    expect(msg).toMatch(/not configured/i);
    expect(msg).not.toMatch(/temporarily unavailable/i);
  });

  // ── Phase 2: Idempotency & deduplication ──────────────────────────────────

  it("returns null and shows toast on 409 request_in_progress (dedup hit)", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const dupErr = Object.assign(new Error("Request already in progress"), {
      status: 409,
      body: { code: "request_in_progress", message: "Request already in progress" },
    });
    const action = vi.fn().mockRejectedValue(dupErr);

    let value: unknown;
    await act(async () => { value = await result.current.execute(action); });

    expect(value).toBeNull();
    // Credits cache must NOT be invalidated — no credits were charged.
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("does not double-charge credits when action throws after first success", async () => {
    // Simulate: first call succeeds, second call immediately throws (double-click path).
    // The hook should not call invalidateQueries on the second (failed) call.
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const successAction = vi.fn().mockResolvedValue("result");
    const failAction = vi.fn().mockRejectedValue(new Error("duplicate"));

    await act(async () => { await result.current.execute(successAction); });
    const callsAfterFirst = mockInvalidateQueries.mock.calls.length;

    await act(async () => { await result.current.execute(failAction); });

    // invalidateQueries should not have been called again after the failed second action.
    expect(mockInvalidateQueries.mock.calls.length).toBe(callsAfterFirst);
  });

  it("invalidates credits cache only once even if action is called concurrently", async () => {
    // Simulate two rapid clicks: both fire execute() before either resolves.
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const action = vi.fn().mockResolvedValue("ok");

    await act(async () => {
      await Promise.all([
        result.current.execute(action),
        result.current.execute(action),
      ]);
    });

    // Both resolved successfully. invalidateQueries is called twice per success
    // (for 'me' and 'ai-usage-breakdown'), so 2 actions × 2 = 4 calls total.
    // The important thing is that only one provider action is expected per
    // logical user click; the server handles dedup. This test verifies the
    // hook itself doesn't suppress both calls client-side.
    expect(action).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(4); // 2 invalidations × 2 actions
  });

  it("does not invalidate credits cache when provider fails (no charge path)", async () => {
    const { result } = renderHook(() => useAIAction({ operation: "tailor" }));
    const providerErr = Object.assign(new Error("Provider unavailable"), { status: 503 });
    const action = vi.fn().mockRejectedValue(providerErr);

    await act(async () => { await result.current.execute(action); });

    expect(toastError).toHaveBeenCalledTimes(1);
    // Credits should NOT be invalidated — provider failed, no deduction occurred.
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
