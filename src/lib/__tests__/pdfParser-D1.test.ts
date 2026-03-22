/**
 * D1 — PDF parsing unit tests
 * Tests parseResumeText, extractDateRange, extractTextFromPDF, and parseTextWithAI.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock pdfjs-dist before importing textExtractor (which imports it at module level)
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            {
              str: "John Doe",
              transform: [1, 0, 0, 1, 50, 700],
              hasEOL: true,
            },
            {
              str: "Software Engineer",
              transform: [1, 0, 0, 1, 50, 680],
              hasEOL: true,
            },
            {
              str: "john@example.com",
              transform: [1, 0, 0, 1, 50, 660],
              hasEOL: true,
            },
          ],
        }),
      }),
    }),
  }),
  GlobalWorkerOptions: { workerSrc: "" },
}));

// Mock pdfjs worker URL import
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-worker.js",
}));

vi.mock("@/lib/supabaseAuth", () => ({
  getSupabaseToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/aiProvider", () => ({
  trackGeminiUsage: vi.fn(),
  handleAIError: vi.fn().mockRejectedValue(new Error("AI failed")),
  checkAIFallback: vi.fn(),
}));

import { parseResumeText, extractDateRange } from "@/lib/pdf/sectionParsers";
import { extractTextFromPDF, PDFParseError } from "@/lib/pdf/textExtractor";
import { parseTextWithAI } from "@/lib/pdfParser";
import { mockFetch } from "@/test/mocks/fetch";

// ── parseResumeText ──────────────────────────────────────────────────────────

describe("parseResumeText (D1)", () => {
  const sampleResume = `Jane Doe
jane@example.com | 555-1234 | San Francisco, CA

SUMMARY
Results-driven software engineer with 5+ years building React and TypeScript applications.

EXPERIENCE
Senior Software Engineer
Tech Corp | 2020-01 - Present
Led development of core React components. Improved performance by 40%.
• Mentored 3 junior engineers
• Reduced load time by 500ms

EDUCATION
B.S. Computer Science
State University | 2015-2019

SKILLS
React, TypeScript, Node.js, PostgreSQL, AWS`;

  it("returns a ResumeData object from plain text", () => {
    const result = parseResumeText(sampleResume);
    expect(result).toHaveProperty("contactInfo");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("experience");
    expect(result).toHaveProperty("education");
    expect(result).toHaveProperty("skills");
  });

  it("extracts contact info name and email", () => {
    const result = parseResumeText(sampleResume);
    expect(result.contactInfo.fullName).toContain("Jane");
    expect(result.contactInfo.email).toBe("jane@example.com");
  });

  it("extracts summary text", () => {
    const result = parseResumeText(sampleResume);
    expect(result.summary).toContain("React");
  });

  it("extracts at least one experience entry", () => {
    const result = parseResumeText(sampleResume);
    expect(result.experience.length).toBeGreaterThan(0);
    const exp = result.experience[0];
    expect(exp).toHaveProperty("company");
    expect(exp).toHaveProperty("position");
  });

  it("extracts education entry", () => {
    const result = parseResumeText(sampleResume);
    expect(result.education.length).toBeGreaterThan(0);
    expect(result.education[0]).toHaveProperty("institution");
  });

  it("extracts skills array", () => {
    const result = parseResumeText(sampleResume);
    expect(Array.isArray(result.skills)).toBe(true);
    expect(result.skills.length).toBeGreaterThan(0);
  });

  it("handles empty string without throwing", () => {
    const result = parseResumeText("");
    expect(result).toHaveProperty("contactInfo");
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
  });
});

// ── extractDateRange ─────────────────────────────────────────────────────────

describe("extractDateRange (D1)", () => {
  it("parses standard date range (Jan 2020 - Mar 2023)", () => {
    const result = extractDateRange("Jan 2020 - Mar 2023");
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
    expect(result.current).toBe(false);
  });

  it("detects 'Present' as current position", () => {
    const result = extractDateRange("2021 - Present");
    expect(result.current).toBe(true);
    expect(result.endDate).toBe("");
  });

  it("detects 'Current' as current position", () => {
    const result = extractDateRange("March 2019 - Current");
    expect(result.current).toBe(true);
  });

  it("handles slash-separated format (01/2020 - 06/2023)", () => {
    const result = extractDateRange("01/2020 - 06/2023");
    expect(result.startDate).toBeTruthy();
    expect(result.current).toBe(false);
  });

  it("returns empty strings for unrecognized text", () => {
    const result = extractDateRange("No dates here at all");
    expect(result.startDate).toBe("");
    expect(result.endDate).toBe("");
    expect(result.current).toBe(false);
  });

  it("handles single graduation year", () => {
    const result = extractDateRange("Graduated 2019");
    expect(result.endDate).toBe("2019");
    expect(result.startDate).toBe("");
  });
});

// ── extractTextFromPDF ───────────────────────────────────────────────────────

/** Helper: create a File-like object with arrayBuffer support for jsdom */
function makePdfFile(name = "resume.pdf"): File {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
  const file = new File([bytes], name, { type: "application/pdf" });
  // jsdom File may not have arrayBuffer; polyfill it
  if (!file.arrayBuffer) {
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(bytes.buffer),
    });
  }
  return file;
}

describe("extractTextFromPDF (D1)", () => {
  it("returns ExtractionResult with pageCount from mocked pdfjs", async () => {
    const file = makePdfFile();
    // Provide enough text items so wordCount >= 10
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: Array.from({ length: 15 }, (_, i) => ({
              str: `Word${i}`,
              transform: [1, 0, 0, 1, 50, 700 - i * 20],
              hasEOL: i % 3 === 0,
            })),
          }),
        }),
      }),
    });

    const result = await extractTextFromPDF(file);
    expect(result).toHaveProperty("pageCount");
    expect(result.pageCount).toBe(1);
  });

  it("throws PDFParseError with PASSWORD_PROTECTED code on PasswordException", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.reject(
        Object.assign(new Error("Password required"), { name: "PasswordException" })
      ),
    });

    const file = makePdfFile("locked.pdf");
    await expect(extractTextFromPDF(file)).rejects.toMatchObject({
      code: "PASSWORD_PROTECTED",
      name: "PDFParseError",
    });
  });

  it("throws PDFParseError with CORRUPTED code on Invalid PDF error", async () => {
    const { getDocument } = await import("pdfjs-dist");
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.reject(new Error("Invalid PDF structure")),
    });

    const file = makePdfFile("bad.pdf");
    await expect(extractTextFromPDF(file)).rejects.toMatchObject({
      code: "CORRUPTED",
    });
  });
});

// ── PDFParseError ─────────────────────────────────────────────────────────────

describe("PDFParseError (D1)", () => {
  it("has the correct code and name", () => {
    const err = new PDFParseError("File is locked", "PASSWORD_PROTECTED");
    expect(err.code).toBe("PASSWORD_PROTECTED");
    expect(err.name).toBe("PDFParseError");
    expect(err.message).toBe("File is locked");
    expect(err instanceof Error).toBe(true);
  });

  it("supports all error codes", () => {
    const codes = ["NO_TEXT", "PASSWORD_PROTECTED", "CORRUPTED", "UNKNOWN"] as const;
    for (const code of codes) {
      const err = new PDFParseError("test", code);
      expect(err.code).toBe(code);
    }
  });
});

// ── parseTextWithAI ──────────────────────────────────────────────────────────

describe("parseTextWithAI (D1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns AI-parsed resume data on success", async () => {
    const aiResult = {
      contactInfo: { fullName: "Jane Doe", email: "jane@example.com", phone: "", location: "" },
      summary: "AI-parsed summary",
      experience: [],
      education: [],
      skills: ["React"],
      certifications: [],
      templateId: "modern",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(aiResult),
    });

    const result = await parseTextWithAI("Jane Doe, Software Engineer...");
    expect(result.summary).toBe("AI-parsed summary");
    expect(result.contactInfo.fullName).toBe("Jane Doe");
  });

  it("falls back to local parser on AbortError (timeout simulation)", async () => {
    // Simulate the fetch being aborted (mimics the 120s AbortController firing)
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    );

    const result = await parseTextWithAI(
      "Jane Doe\njane@example.com\n\nSUMMARY\nExperienced engineer."
    );

    // Falls back to local parseResumeText — should have contactInfo shape
    expect(result).toHaveProperty("contactInfo");
    expect(result).toHaveProperty("experience");
  });
});
