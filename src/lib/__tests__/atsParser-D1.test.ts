/**
 * D1 — simulateATSParsing unit tests
 * Tests the synchronous ATS simulation — no mocks needed.
 */
import { describe, it, expect } from "vitest";
import { simulateATSParsing } from "@/lib/atsParserSimulation";
import type { ResumeData } from "@/types/resume";

const makeResume = (overrides: Partial<ResumeData> = {}): ResumeData => ({
  contactInfo: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    location: "San Francisco, CA",
  },
  summary:
    "Results-driven software engineer with 5+ years building scalable React applications and TypeScript solutions.",
  experience: [
    {
      id: "exp-1",
      company: "Tech Corp",
      position: "Senior Software Engineer",
      startDate: "2020-01",
      endDate: "",
      current: true,
      description: "Led development of core React components",
      achievements: ["Improved load time by 40%", "Mentored 3 junior developers"],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2015-09",
      endDate: "2019-06",
    },
  ],
  skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
  certifications: [],
  templateId: "modern",
  ...overrides,
});

describe("simulateATSParsing (D1)", () => {
  it("returns an ATSParsedResult with correct shape", () => {
    const result = simulateATSParsing(makeResume());
    expect(result).toHaveProperty("sections");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("missingKeywords");
    expect(result).toHaveProperty("detectedKeywords");
    expect(result).toHaveProperty("matchedKeywords");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("formattingWarnings");
    expect(Array.isArray(result.sections)).toBe(true);
  });

  it("detects contact section when all fields are present", () => {
    const result = simulateATSParsing(makeResume());
    const contactSection = result.sections.find((s) => s.id === "contact");
    expect(contactSection).toBeDefined();
    expect(contactSection?.status).toBe("detected");
    expect(contactSection?.issues).toHaveLength(0);
  });

  it("flags missing email and phone in contact section", () => {
    const resume = makeResume({
      contactInfo: { fullName: "Jane Doe", email: "", phone: "", location: "SF" },
    });
    const result = simulateATSParsing(resume);
    const contactSection = result.sections.find((s) => s.id === "contact");
    expect(contactSection?.issues).toContain("Missing email address");
    expect(contactSection?.issues).toContain("Missing phone number");
  });

  it("matches keywords from job description against resume", () => {
    const jd = "We need a React developer with TypeScript and Node.js experience.";
    const result = simulateATSParsing(makeResume(), jd);
    // Resume has React, TypeScript, Node.js in skills — should match
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(
      result.matchedKeywords.some((k) => ["react", "typescript", "node"].includes(k))
    ).toBe(true);
  });

  it("reports missing keywords from job description not in resume", () => {
    const jd = "Expert in Kubernetes, Docker, and Terraform required.";
    const result = simulateATSParsing(makeResume(), jd);
    // Resume doesn't have these skills
    expect(result.missingKeywords.length).toBeGreaterThan(0);
  });

  it("returns a score between 0 and 100", () => {
    const result = simulateATSParsing(makeResume(), "React TypeScript developer needed");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("works without a job description (no crash)", () => {
    const result = simulateATSParsing(makeResume());
    expect(result).toBeDefined();
    expect(result.missingKeywords).toEqual([]);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("adds formatting warning for multi-column layout signal", () => {
    const result = simulateATSParsing(makeResume(), undefined, { isMultiColumn: true });
    expect(result.formattingWarnings.some((w) => w.includes("Two-column"))).toBe(true);
  });

  it("adds low-confidence formatting warning when confidence < 0.5", () => {
    const result = simulateATSParsing(makeResume(), undefined, { confidence: 0.3 });
    expect(result.formattingWarnings.some((w) => w.includes("Low text extraction"))).toBe(true);
  });

  it("flags summary that uses first-person pronouns", () => {
    const resume = makeResume({
      summary: "I am a developer who led teams and built amazing products.",
    });
    const result = simulateATSParsing(resume);
    const summarySection = result.sections.find((s) => s.id === "summary");
    expect(summarySection?.issues.some((i) => i.includes("first-person"))).toBe(true);
  });

  it("detects summary section as partial when too short", () => {
    const resume = makeResume({ summary: "Short summary." });
    const result = simulateATSParsing(resume);
    const summarySection = result.sections.find((s) => s.id === "summary");
    expect(summarySection?.status).toBe("partial");
  });

  it("handles empty experience array gracefully", () => {
    const resume = makeResume({ experience: [] });
    const result = simulateATSParsing(resume);
    const expSection = result.sections.find((s) => s.id === "experience");
    expect(expSection?.issues).toContain("No work experience entries");
  });
});
