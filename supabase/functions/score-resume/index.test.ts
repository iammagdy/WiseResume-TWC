import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  scoreContactCompleteness,
  scoreSectionStructure,
  scoreParsability,
  scoreLengthDensity,
  scoreKeywordOptimization,
  scoreContentQuality,
  generateFeedback,
} from "../_shared/scoringFunctions.ts";

// ── scoreContactCompleteness ────────────────────────────────────────

Deno.test("contactCompleteness: empty object → 0", () => {
  assertEquals(scoreContactCompleteness({}), 0);
});

Deno.test("contactCompleteness: partial fields → proportional", () => {
  assertEquals(scoreContactCompleteness({ fullName: "John", email: "j@e.com" }), 40);
});

Deno.test("contactCompleteness: all fields → 100", () => {
  assertEquals(scoreContactCompleteness({
    fullName: "John", email: "j@e.com", phone: "123", location: "NY", linkedin: "url"
  }), 100);
});

Deno.test("contactCompleteness: portfolio satisfies link field", () => {
  assertEquals(scoreContactCompleteness({
    fullName: "John", email: "j@e.com", phone: "123", location: "NY", portfolio: "url"
  }), 100);
});

// ── scoreSectionStructure ───────────────────────────────────────────

Deno.test("sectionStructure: empty → 0", () => {
  assertEquals(scoreSectionStructure({}), 0);
});

Deno.test("sectionStructure: all core → 85", () => {
  assertEquals(scoreSectionStructure({
    summary: "Hello", experience: [{}], education: [{}], skills: ["JS"]
  }), 85);
});

Deno.test("sectionStructure: core + optional → 100", () => {
  assertEquals(scoreSectionStructure({
    summary: "Hello", experience: [{}], education: [{}], skills: ["JS"], certifications: ["AWS"]
  }), 100);
});

// ── scoreParsability ────────────────────────────────────────────────

Deno.test("parsability: clean resume → 100", () => {
  assertEquals(scoreParsability({
    experience: [{ startDate: "2020-01", endDate: "2022-01", achievements: ["Did stuff"] }],
    education: [{ startDate: "2016-01", endDate: "2020-01" }],
  }), 100);
});

Deno.test("parsability: mixed date formats → penalty", () => {
  const score = scoreParsability({
    experience: [{ startDate: "2020-01", endDate: "Jan 2022", achievements: ["x"] }],
  });
  assertEquals(score, 85); // -15 for mixed formats
});

Deno.test("parsability: missing start dates → penalty", () => {
  const score = scoreParsability({
    experience: [
      { endDate: "2022-01", achievements: ["x"] },
      { endDate: "2021-01", achievements: ["x"] },
    ],
  });
  // -20 for 2 missing dates, -0 for mixed (both unknown)
  assertEquals(score, 80);
});

Deno.test("parsability: empty descriptions → penalty", () => {
  const score = scoreParsability({
    experience: [
      { startDate: "2020-01", endDate: "2022-01" },
      { startDate: "2019-01", endDate: "2020-01" },
    ],
  });
  // -30 for 2 empty descriptions (capped)
  assertEquals(score, 70);
});

Deno.test("parsability: special bullet chars → -10", () => {
  const score = scoreParsability({
    experience: [{ startDate: "2020-01", endDate: "2022-01", description: "• Did stuff", achievements: ["x"] }],
  });
  assertEquals(score, 90);
});

Deno.test("parsability: floor at 0", () => {
  const score = scoreParsability({
    experience: [
      { description: "• stuff" },
      { description: "• stuff" },
      { description: "• stuff" },
      {},
    ],
  });
  assertEquals(score >= 0, true);
});

// ── scoreLengthDensity ──────────────────────────────────────────────

Deno.test("lengthDensity: no bullets, no experience, few skills → 0", () => {
  assertEquals(scoreLengthDensity({}), 0); // 10 - 20(skills) - 30(exp) = clamped 0
});

Deno.test("lengthDensity: 3 bullets → 30", () => {
  assertEquals(scoreLengthDensity({
    experience: [{ achievements: ["a", "b", "c"] }],
    skills: ["a", "b", "c"],
  }), 30);
});

Deno.test("lengthDensity: 10 bullets → 75", () => {
  assertEquals(scoreLengthDensity({
    experience: [{ achievements: Array(10).fill("x") }],
    skills: ["a", "b", "c"],
  }), 75);
});

Deno.test("lengthDensity: <3 skills penalty", () => {
  assertEquals(scoreLengthDensity({
    experience: [{ achievements: Array(10).fill("x") }],
    skills: ["a"],
  }), 55); // 75 - 20
});

// ── scoreKeywordOptimization ────────────────────────────────────────

Deno.test("keywordOptimization: no skills → 0", () => {
  assertEquals(scoreKeywordOptimization({}), 0);
});

Deno.test("keywordOptimization: skills not echoed → 25", () => {
  assertEquals(scoreKeywordOptimization({
    skills: ["React", "Vue"],
    summary: "I work with Angular",
  }), 25);
});

Deno.test("keywordOptimization: partial echo", () => {
  const score = scoreKeywordOptimization({
    skills: ["React", "Vue", "Angular", "TypeScript"],
    summary: "I use React and Angular daily",
  });
  // 2/4 = 0.5 → 60
  assertEquals(score, 60);
});

Deno.test("keywordOptimization: full echo → 95", () => {
  const score = scoreKeywordOptimization({
    skills: ["React", "Vue"],
    summary: "I use React and Vue",
  });
  assertEquals(score, 95);
});

Deno.test("keywordOptimization: 8+ skills bonus", () => {
  const skills = ["react", "vue", "angular", "python", "java", "docker", "redis", "graphql"];
  const score = scoreKeywordOptimization({
    skills,
    summary: skills.join(" "),
  });
  assertEquals(score, 100); // 95 + 5
});

// ── scoreContentQuality ─────────────────────────────────────────────

Deno.test("contentQuality: no experience → 5", () => {
  assertEquals(scoreContentQuality({}), 5);
});

Deno.test("contentQuality: descriptions only → 15", () => {
  assertEquals(scoreContentQuality({
    experience: [{ description: "Did things" }],
  }), 15);
});

Deno.test("contentQuality: action verbs boost score", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: ["Led the team", "Managed the project"] }],
  });
  // 2/2 action = 50, 0/2 quantified = 0 → 50
  assertEquals(score, 50);
});

Deno.test("contentQuality: quantified bullets boost score", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: ["Grew revenue by 30%", "Saved $50k annually"] }],
  });
  // 0/2 action (grew/saved not in set), 2/2 quantified = 50 → 50
  assertEquals(score, 50);
});

Deno.test("contentQuality: action verbs + quantified → high score", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: [
      "Increased revenue by 30%",
      "Reduced costs by $50k",
      "Led team of 10 engineers",
    ] }],
  });
  // 3/3 action (increased, reduced, led) = 50, 3/3 quantified = 50 → 100
  assertEquals(score, 100);
});

// ── generateFeedback ────────────────────────────────────────────────

Deno.test("generateFeedback: returns strength for highest, improvement for lowest", () => {
  const result = generateFeedback({
    keywordOptimization: 90,
    contentQuality: 20,
    sectionStructure: 50,
    parsability: 50,
    contactCompleteness: 50,
    lengthDensity: 50,
  });
  assertEquals(result.topStrength, 'Skills are well-echoed throughout experience descriptions.');
  assertEquals(result.topImprovement, 'Start bullets with action verbs and add numbers/metrics to quantify your impact.');
});
