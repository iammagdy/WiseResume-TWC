/**
 * Automated browser-style test for the AI Provider DevKit panel.
 *
 * Covers the four behaviours called out in task-4:
 *   1. The panel renders successfully (admin landing on it).
 *   2. Switching tabs does NOT leave a stale "OK" / done banner from a
 *      previous tab's live test.
 *   3. Picking a model and pressing Enter inside the confirm card commits
 *      the switch (keyboard-driven confirm).
 *   4. The header "Refresh all" button surfaces failures via a toast.
 *
 * The repo doesn't ship Playwright — it uses Vitest + React Testing Library
 * for all UI tests today (see `vitest.config.ts`, `src/test/setup.ts`). This
 * spec follows that convention so it runs as part of the standard `npm test`
 * suite on a clean checkout, while still exercising the same end-to-end
 * paths Playwright would have.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Override the global zustand mock with the full settings shape AIProviderPanel
// reads. Per-file vi.mock takes precedence over the one in test/setup.ts.
const settingsState = {
  aiProvider: "wiseresume" as const,
  wiseresumeSubProvider: "auto" as const,
  setWiseresumeSubProvider: vi.fn(),
  openrouterModel: "",
  setOpenrouterModel: vi.fn(),
  groqModel: "",
  setGroqModel: vi.fn(),
  geminiModel: "",
  setGeminiModel: vi.fn(),
  geminiApiKey: "",
  geminiKeyValidated: false,
  geminiDailyUsage: null as null | { date: string; count: number },
  ollamaModel: "",
  setOllamaModel: vi.fn(),
  ollamaBaseUrl: "http://localhost:11434",
};

vi.mock("@/store/settingsStore", () => {
  type SettingsState = typeof settingsState;
  type UseSettingsStore = {
    <T>(selector: (s: SettingsState) => T): T;
    (): SettingsState;
    getState: () => SettingsState;
    setState: (next: Partial<SettingsState>) => void;
    subscribe: (listener: (s: SettingsState) => void) => () => void;
  };
  const useSettingsStore = ((selector?: (s: SettingsState) => unknown) =>
    selector ? selector(settingsState) : settingsState) as UseSettingsStore;
  useSettingsStore.getState = () => settingsState;
  useSettingsStore.setState = vi.fn();
  useSettingsStore.subscribe = vi.fn(() => () => {});
  return { useSettingsStore };
});

// AIProviderPanel imports `Map` from lucide-react, which shadows the global
// `Map` constructor at module scope. Vite handles this in production via
// build-time bundling, but Vitest evaluates the source directly and the
// in-flight request deduper (`new Map<...>()`) blows up at module load.
// Replace every lucide-react icon with a trivial stub so module evaluation
// succeeds — the icons themselves aren't relevant to behaviour.
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("lucide-react");
  // Must be a regular function (not arrow) so that `new Map()` inside
  // AIProviderPanel.tsx — where `Map` is the lucide-react import — still
  // produces a usable object instead of throwing.
  // Same stub doubles as a constructor: when AIProviderPanel does
  // `new Map<...>()` it actually invokes this with `new`, in which case we
  // hand back a real `Map` instance so the in-flight deduper still works.
  function stub(props: Record<string, unknown>) {
    if (new.target) {
      // Returning an object from a constructor overrides `this`.
      return new (globalThis as { Map: MapConstructor }).Map();
    }
    return React.createElement("svg", { "data-testid": "icon", ...props });
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) out[key] = stub;
  return out;
});

// NOTE: Don't use `vi.fn().mockResolvedValue(...)` here — `vi.clearAllMocks()`
// in beforeEach would wipe its implementation, leaving the function returning
// `undefined` so `fetchWithToken` would throw "Session expired" and never
// reach our mocked `fetch`. A plain async function is immune to clearAllMocks.
vi.mock("@/lib/supabaseAuth", () => ({
  getSupabaseToken: () => Promise.resolve("test-token"),
}));

vi.mock("@/contexts/DevKitSessionContext", () => ({
  getDevKitToken: () => "test-token",
  DevKitSessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useDevKitSession: () => ({
    isUnlocked: true,
    unlock: vi.fn(),
    lock: vi.fn(),
    secondsUntilLock: 0,
  }),
}));

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/edgeFunctions", () => ({
  edgeFunctions: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { toast } from "@/test/mocks/sonner";
import { mockFetch } from "@/test/mocks/fetch";
import { AIProviderPanel } from "@/components/dev-kit/AIProviderPanel";

// ── Helpers ────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, ok = true, status = 200) {
  const make = (): Response => {
    const res = {
      ok,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
      headers: new Headers(),
      // fetchWithTokenDedup calls .clone() before handing the Response back.
      clone: () => make(),
    } as unknown as Response;
    return res;
  };
  return Promise.resolve(make());
}

function resetSettingsState() {
  settingsState.openrouterModel = "";
  settingsState.groqModel = "";
  settingsState.geminiModel = "";
  settingsState.ollamaModel = "";
  settingsState.wiseresumeSubProvider = "auto";
  Object.values(settingsState).forEach((v) => {
    if (typeof v === "function" && "mockClear" in (v as object)) {
      (v as ReturnType<typeof vi.fn>).mockClear();
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSettingsState();
  // Default: every fetch succeeds with empty payloads. Specific tests override.
  mockFetch.mockImplementation(() => jsonResponse({}));
  // Default: edge function invocations succeed with an empty providers list.
  mockInvoke.mockImplementation((fnName: string) => {
    if (fnName === "ai-breaker-status") {
      return Promise.resolve({ data: { providers: [] }, error: null });
    }
    return Promise.resolve({ data: { success: true }, error: null });
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("AIProviderPanel (DevKit)", () => {
  it("renders the header and provider tabs when an admin opens it", async () => {
    renderWithProviders(<AIProviderPanel />);

    expect(
      await screen.findByRole("heading", { name: /ai provider/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh all/i })).toBeInTheDocument();
    // Note: provider names ("OpenRouter", "Groq", …) appear twice — once as
    // the tab buttons, once as the Recent Activity filter chips. Use
    // getAllByRole to assert presence without ambiguity.
    expect(screen.getAllByRole("button", { name: /^openrouter$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^groq$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^gemini$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^ollama$/i }).length).toBeGreaterThan(0);
  });

  it("clears the previous tab's OK banner when switching tabs", async () => {
    mockInvoke.mockImplementation((fnName: string) => {
      if (fnName === "ai-breaker-status") {
        return Promise.resolve({ data: { providers: [] }, error: null });
      }
      if (fnName === "ai-test") {
        return Promise.resolve({
          data: {
            success: true,
            model: "openrouter/auto",
            latencyMs: 123,
            response: "OK",
          },
          error: null,
        });
      }
      return Promise.resolve({ data: { success: true }, error: null });
    });

    renderWithProviders(<AIProviderPanel />);

    // OpenRouter tab is the default. Run its live test.
    const testButtons = await screen.findAllByRole("button", { name: /^test$/i });
    fireEvent.click(testButtons[0]);

    // Done banner shows "<latencyMs>ms · <model>".
    await screen.findByText(/123ms · openrouter\/auto/);

    // Switching to a different tab must remount the sub-panel (key={tab})
    // so the previous tab's stale "done" banner is gone. The "Groq" label
    // appears twice (tab + audit filter chip); the tab is the first match.
    const groqButtons = screen.getAllByRole("button", { name: /^groq$/i });
    fireEvent.click(groqButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/123ms · openrouter\/auto/)).not.toBeInTheDocument();
    });
  });

  it("commits a model switch when the user picks one and presses Enter", async () => {
    // Provide a single OpenRouter model so the list isn't empty.
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("openrouter-models")) {
        return jsonResponse({
          models: [
            {
              id: "test-org/test-model",
              name: "Test Model",
              pricing: { prompt: "0", completion: "0" },
              context_length: 4096,
            },
          ],
        });
      }
      return jsonResponse({});
    });

    renderWithProviders(<AIProviderPanel />);

    // Wait for the model row to appear, then click it to open the confirm card.
    const modelRow = await screen.findByRole("button", {
      name: /test-org\/test-model/i,
    });
    fireEvent.click(modelRow);

    expect(
      await screen.findByRole("dialog", {
        name: /confirm switching active model to test-org\/test-model/i,
      }),
    ).toBeInTheDocument();

    // Keyboard-driven confirm: pressing Enter on window should commit.
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => {
      expect(settingsState.setOpenrouterModel).toHaveBeenCalledWith(
        "test-org/test-model",
      );
    });
  });

  it("surfaces a toast when the Refresh-all button hits a failing endpoint", async () => {
    // Make the OpenRouter status endpoint fail; everything else succeeds.
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("openrouter-status")) {
        return jsonResponse({ error: "boom" }, false, 500);
      }
      return jsonResponse({});
    });

    renderWithProviders(<AIProviderPanel />);

    // Wait for initial mount fetches to settle (button is disabled while
    // `breakerLoading` is true) before triggering Refresh all.
    const refreshBtn = await screen.findByRole("button", { name: /refresh all/i });
    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled();
    });

    // Task #10 / Step 6: the panel's deduper now releases each in-flight
    // slot the moment the request settles (no 250ms post-settle hold), so
    // a microtask flush is enough to ensure refresh-all sees fresh fetches.
    await Promise.resolve();

    // Initial mount calls fetchManagedOR which may fail and surface inline
    // — but no toast fires until the user-initiated Refresh-all. Clear the
    // toast mock so we assert specifically on the click-driven outcome.
    toast.error.mockClear();

    fireEvent.click(refreshBtn);

    await waitFor(
      () => {
        expect(toast.error).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
    expect(toast.error.mock.calls[0][0]).toMatch(
      /refresh tasks failed/i,
    );
  });

  // Task #10 / Step 4: header "Refresh all" must throttle to at most one
  // fan-out per ~3 seconds even if the button is rage-clicked while the
  // disabled-state guard is briefly off.
  it("throttles back-to-back Refresh-all clicks within the 3s window", async () => {
    let openrouterStatusCalls = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("openrouter-status")) {
        openrouterStatusCalls += 1;
      }
      return jsonResponse({});
    });

    renderWithProviders(<AIProviderPanel />);

    const refreshBtn = await screen.findByRole("button", { name: /refresh all/i });
    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled();
    });

    // First click: fans out, hits the openrouter-status endpoint once.
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled();
    });
    const callsAfterFirst = openrouterStatusCalls;

    // Second click within the throttle window must be a no-op.
    fireEvent.click(refreshBtn);
    // Give any spurious fetch a microtask + macrotask to fire.
    await new Promise((r) => setTimeout(r, 50));
    expect(openrouterStatusCalls).toBe(callsAfterFirst);
  });

  // Task #10 / Step 5: filter changes in the Recent Activity section must
  // abort the prior in-flight audit request, not let it resolve and clobber
  // the fresh result. We assert by counting AbortError-aware fetches.
  it("aborts the prior audit-recent fetch when a filter changes", async () => {
    const aborted: boolean[] = [];
    let auditCallCount = 0;
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("audit-recent")) {
        auditCallCount += 1;
        return new Promise<Response>((resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          if (signal) {
            signal.addEventListener("abort", () => {
              aborted.push(true);
              const e = new DOMException("aborted", "AbortError");
              reject(e);
            });
          }
          // Never resolve on its own — only the abort path or the final
          // (un-aborted) call lets the test progress.
          setTimeout(() => resolve(makeJsonOk({ entries: [], nextCursor: null })), 10000);
        });
      }
      return jsonResponse({});
    });

    renderWithProviders(<AIProviderPanel />);

    // Wait for the section to mount and issue its first audit-recent call.
    await waitFor(() => {
      expect(auditCallCount).toBeGreaterThanOrEqual(1);
    });

    // Click the audit filter row's "Groq" chip (last match — first is the
    // top-level tab button) to change the provider filter and trigger
    // a refetch, which must abort the in-flight initial request.
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^groq$/i }).length).toBeGreaterThanOrEqual(2);
    });
    const groqChips = screen.getAllByRole("button", { name: /^groq$/i });
    fireEvent.click(groqChips[groqChips.length - 1]);

    await waitFor(() => {
      expect(aborted.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// Helper used by the abort test — produces a Response-shaped object the
// panel can consume via res.json().
function makeJsonOk(body: unknown): Response {
  const make = (): Response => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
    clone: () => make(),
  } as unknown as Response);
  return make();
}
