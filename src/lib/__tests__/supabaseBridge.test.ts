import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { 
  exchangeToken, 
  getToken, 
  isReady, 
  clearBridge, 
  refreshTokenIfNeeded,
  setKindeTokenGetter 
} from "../supabaseBridge";

// Mock the constants
vi.mock('@/lib/supabaseConstants', () => ({
  EDGE_FUNCTIONS_URL: 'https://mock-edge-functions.com',
  EDGE_FUNCTIONS_ANON_KEY: 'mock-anon-key'
}));

describe("supabaseBridge", () => {
  beforeEach(() => {
    clearBridge();
    // Setup fetch mock for all tests
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully exchange a Kinde token for a Supabase token (Scenario 2.1)", async () => {
    // Mock a successful fetch response
    const mockToken = "mock-supabase-jwt-123";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        supabaseToken: mockToken,
        userId: "user-123",
        kindeSub: "kinde-sub-123",
        // Expires far in the future
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      })
    });

    // Initial state
    expect(isReady()).toBe(false);
    expect(getToken()).toBeNull();

    // Exchange token
    await exchangeToken("fake-kinde-token");

    // Verify fetch was called correctly (apiFnUrl produces /api/fn/<name>)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/fn/token-exchange",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "Authorization": "Bearer fake-kinde-token",
        })
      })
    );

    // Verify token is stored and bridge is ready
    expect(isReady()).toBe(true);
    expect(getToken()).toBe(mockToken);
  });

  it("should clear the bridge completely on sign-out", async () => {
    // Setup a token first
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        supabaseToken: "token-to-be-cleared",
        userId: "user-123",
        kindeSub: "kinde-sub-123",
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      })
    });
    
    await exchangeToken("fake-kinde-token");
    expect(isReady()).toBe(true);

    // Action: Clear
    clearBridge();

    // Verify
    expect(isReady()).toBe(false);
    expect(getToken()).toBeNull();
  });

  it("should attempt to refresh if kinde token getter is registered", async () => {
     (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        supabaseToken: "refreshed-token-456",
        userId: "user-123",
        kindeSub: "kinde-sub-123",
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      })
    });

    const mockGetter = vi.fn().mockResolvedValue("new-kinde-token");
    setKindeTokenGetter(mockGetter);

    const result = await refreshTokenIfNeeded();
    
    expect(result).toBe(true);
    expect(mockGetter).toHaveBeenCalled();
    expect(getToken()).toBe("refreshed-token-456");
  });
});
