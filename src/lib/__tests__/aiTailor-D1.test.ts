/**
 * D1 — tailorResumeWithProgress unit tests
 * Tests the lib function directly — mocks appwriteFunctions.invoke.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ResumeData } from "@/types/resume";

vi.mock("@/lib/aiFallbackToast", () => ({
  checkAIFallback: vi.fn(),
}));

vi.mock("@/lib/appwrite-functions", () => ({
  appwriteFunctions: {
    invoke: vi.fn(),
  },
}));

import { TAILOR_FRONTEND_TIMEOUT_MS, tailorResumeWithProgress } from "@/lib/aiTailor";
import { appwriteFunctions } from "@/lib/appwrite-functions";

const mockInvoke = appwriteFunctions.invoke as ReturnType<typeof vi.fn>;

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

  it("resolves with result on successful invoke", async () => {
    mockInvoke.mockResolvedValueOnce({ data: makeMockResult(), error: null });

    const onProgress = vi.fn();
    const result = await tailorResumeWithProgress(
      mockResume as ResumeData,
      mockJobDescription,
      onProgress,
      "moderate"
    );

    expect(result.overallScore).toEqual({ before: 58, after: 84 });
    expect(result.summary).toBe("Tailored summary");
    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith(
      "tailor-resume",
      expect.objectContaining({ timeoutMs: TAILOR_FRONTEND_TIMEOUT_MS }),
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ step: "complete", progress: 100 })
    );
  });

  it("calls onProgress with complete step at 100% on success", async () => {
    mockInvoke.mockResolvedValueOnce({ data: makeMockResult(), error: null });

    const onProgress = vi.fn();
    await tailorResumeWithProgress(
      mockResume as ResumeData,
      mockJobDescription,
      onProgress
    );

    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({ step: "complete", progress: 100 });
  });

  it("throws rate_limit error on 429 response", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limit exceeded", status: 429 },
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

  it("throws payment_required error on 402 response", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "credits exhausted", status: 402 },
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress
      )
    ).rejects.toMatchObject({ code: "payment_required" });
  });

  it("does not automatically retry a failed execution", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "internal server error", status: 500 },
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress,
      ),
    ).rejects.toMatchObject({ code: "upstream_5xx" });

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("does not retry rate_limit errors — throws after first call", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limit", status: 429 },
    });

    const onProgress = vi.fn();
    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress
      )
    ).rejects.toMatchObject({ code: "rate_limit" });

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("aborts when AbortSignal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();
    mockInvoke.mockImplementationOnce(async (_name, options) => {
      expect(options.signal).toBe(controller.signal);
      expect(options.signal.aborted).toBe(true);
      return {
        data: null,
        error: { message: "Tailoring wait cancelled.", status: 499, code: "request_cancelled" },
      };
    });

    const onProgress = vi.fn();

    await expect(
      tailorResumeWithProgress(
        mockResume as ResumeData,
        mockJobDescription,
        onProgress,
        "moderate",
        controller.signal,
      ),
    ).rejects.toThrow("Tailoring wait cancelled");
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
