import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("safeClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should throw an error when env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", undefined);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", undefined);

    await expect(() => import("./safeClient")).rejects.toThrowError(
      /Missing Supabase configuration/
    );
  });

  it("should initialize supabase client when env vars are present", async () => {
    const mockUrl = "https://example.supabase.co";
    const mockKey = "mock-key";
    vi.stubEnv("VITE_SUPABASE_URL", mockUrl);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", mockKey);

    const { supabaseConfig } = await import("./safeClient");
    expect(supabaseConfig.url).toBe(mockUrl);
  });
});
