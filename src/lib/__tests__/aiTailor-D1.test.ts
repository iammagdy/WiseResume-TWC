/**
 * D1 — tailorResumeWithProgress unit tests
 * Tests the lib function directly — calls global.fetch (mocked in setup).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ResumeData } from "@/types/resume";

// Mock supabaseAuth so getSupabaseToken doesn't touch real session
vi.mock("@/lib/supabaseAuth", () => ({
  getSupabaseToken: vi.fn().mockResolvedValue(null),
}));

// Mock aiProvider side effects
vi.mock("@/lib/aiProvider", () => ({
  trackGeminiUsage: vi.fn(),
  handleAIError: vi.fn(),
  checkAIFallback: vi.fn(),
}));

vi.mock("@/lib/aiFallbackToast", () => ({
  checkAIFallback: vi.fn(),
}));

import { tailorResumeWithProgress } from "@/lib/aiTailor";
import { mockFetch } from "@/test/mocks/fetch";

const mockResume: Partial<ResumeData> = {
  personalInfo: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    location: "SF",
    title: "Engineer",
    summary: "Engineer",
    website: "",
    linkedin: "",
    github: "",
  },
  experience: [],
  education: [],
  skills: [],
};

const mockJobDescription = "Looking for a React developer with TypeScript skills.";

const makeMockResult = () => ({
  summary: "Tailored summary",
  skills: ["React", "TypeScript"],
  experience: [],
  education: [],
  keyChanges: ["Rewrote summary"],
  overallScore: { before: 58, after: 84 },
});

describe("tailorResumeWithProgress (D1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with result on successful fetch", async () => {
    const mockResult = makeMockResult();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResult),
    });

    const onProgress = vi.fn();
    const result = await tailorResumeWithProgress(
      mockResume as ResumeData,
      mockJobDescription,
      onProgress,
      "moderate"
    );

    expect(result.overallScore).toEqual({ before: 58, after: 84 });
    expect(result.summary).toBe("Tailored summary");
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ step: "complete", progress: 100 })
    );
  });

  it("calls onProgress with complete step at 100% on success", async () => {
    const mockResult = makeMockResult();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResult),
    });

    const onProgress = vi.fn();
    await tailorResumeWithProgress(
      mockResume as ResumeData,
      mockJobDescription,
      onProgress
    );

    // Final call must be the "complete" step at 100%
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({ step: "complete", progress: 100 });
  });

  it("throws rate_limit error on 429 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: "rate limit exceeded" }),
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress
      )
    ).rejects.toMatchObject({ code: "rate_limit" });
  });

  it("throws credits_exhausted error on 402 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: vi.fn().mockResolvedValue({ error: "credits exhausted" }),
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress
      )
    ).rejects.toMatchObject({ code: "credits_exhausted" });
  });

  it("retries once on generic (500) error after 2s delay", async () => {
    vi.useFakeTimers();
    const mockResult = makeMockResult();

    // First call: 500 server error → code = 'generic' → triggers retry
    // Second call: success
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "internal server error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResult),
      });

    const onProgress = vi.fn();
    const promise = tailorResumeWithProgress(
      mockResume as ResumeData,
      mockJobDescription,
      onProgress
    );

    // Advance past the 2s retry delay
    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.overallScore).toEqual({ before: 58, after: 84 });
  });

  it("does not retry rate_limit errors — throws after first call", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: "rate limit" }),
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress
      )
    ).rejects.toMatchObject({ code: "rate_limit" });

    // Should only have been called once — no retry
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("aborts when AbortSignal is triggered", async () => {
    const controller = new AbortController();
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("AbortError"), { name: "AbortError" })
    );

    const onProgress = vi.fn();
    controller.abort();

    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress,
        "moderate",
        controller.signal
      )
    ).rejects.toThrow();
  });
});
