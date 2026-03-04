import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  scoreContactCompleteness,
  scoreSectionStructure,
  scoreParsability,
  scoreLengthDensity,
  scoreKeywordOptimization,
  scoreContentQuality,
  scoreTemplateFriendliness,
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

Deno.test("parsability: all-unknown date formats → no mixed penalty", () => {
  const score = scoreParsability({
    experience: [
      { startDate: "sometime in 2020", endDate: "around 2022", achievements: ["x"] },
    ],
  });
  assertEquals(score, 100);
});

Deno.test("parsability: multiple special bullet chars → still only -10", () => {
  const score = scoreParsability({
    experience: [
      { startDate: "2020-01", endDate: "2021-01", description: "● did A", achievements: ["x"] },
      { startDate: "2021-01", endDate: "2022-01", description: "■ did B", achievements: ["x"] },
      { startDate: "2022-01", endDate: "2023-01", description: "➤ did C", achievements: ["x"] },
    ],
  });
  assertEquals(score, 90);
});

Deno.test("parsability: Present/Current endDate → no penalty", () => {
  const score = scoreParsability({
    experience: [
      { startDate: "2020-01", endDate: "Present", achievements: ["x"] },
    ],
  });
  assertEquals(score, 100);
});

Deno.test("parsability: all entries missing everything → heavy penalties", () => {
  const score = scoreParsability({
    experience: [{}, {}, {}, {}],
  });
  assertEquals(score, 40);
});

Deno.test("parsability: education-only mixed formats → -15", () => {
  const score = scoreParsability({
    education: [
      { startDate: "2016-01", endDate: "2020-01" },
      { startDate: "Sep 2020", endDate: "Jun 2022" },
    ],
  });
  assertEquals(score, 85);
});

Deno.test("parsability: empty experience array → 100", () => {
  assertEquals(scoreParsability({ experience: [] }), 100);
});

Deno.test("parsability: single entry all penalties combined", () => {
  const score = scoreParsability({
    experience: [
      { endDate: "Jan 2022", description: "● did stuff" },
    ],
    education: [
      { startDate: "2016-01", endDate: "2020-01" },
    ],
  });
  assertEquals(score, 65);
});

Deno.test("parsability: large clean resume → 100", () => {
  const entries = Array.from({ length: 12 }, (_, i) => ({
    startDate: `${2010 + i}-01`,
    endDate: `${2011 + i}-01`,
    achievements: ["Did something measurable"],
  }));
  assertEquals(scoreParsability({ experience: entries }), 100);
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

Deno.test("contentQuality: mixed action verbs + partial quantified", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: [
      "Led migration to cloud",        // action verb, no metric
      "Increased sales by 20%",         // action verb + quantified
      "Handled daily operations",       // no action verb, no metric
      "Saved $100k in costs",           // no action verb (saved not in set), quantified
    ] }],
  });
  // 2/4 action (led, increased) = 25, 2/4 quantified (20%, $100k) = 25 → 50
  assertEquals(score, 50);
});

Deno.test("contentQuality: responsibilities field scored same as achievements", () => {
  const score = scoreContentQuality({
    experience: [{ responsibilities: ["Led the team", "Managed the project"] }],
  });
  // 2/2 action = 50, 0/2 quantified = 0 → 50
  assertEquals(score, 50);
});

Deno.test("contentQuality: single bullet, action verb + quantified → 100", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: ["Delivered $2M project on time"] }],
  });
  // 1/1 action (delivered) = 50, 1/1 quantified ($2M) = 50 → 100
  assertEquals(score, 100);
});

Deno.test("contentQuality: single bullet, no action verb, no metric → 0", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: ["Worked on stuff"] }],
  });
  // 0/1 action, 0/1 quantified → 0
  assertEquals(score, 0);
});

Deno.test("contentQuality: paragraph-only entries capped at 15", () => {
  const score = scoreContentQuality({
    experience: [
      { description: "Led team of 10 and increased revenue by 50%" },
      { description: "Managed $5M budget across departments" },
    ],
  });
  // No achievements/responsibilities arrays → hasDesc=true → 15
  assertEquals(score, 15);
});

Deno.test("contentQuality: mixed experiences, only bullets scored", () => {
  const score = scoreContentQuality({
    experience: [
      { achievements: ["Reduced costs by 30%", "Led team of 5"] },
      { description: "General operations work" },
    ],
  });
  // hasOnlyParagraphs=false (has achievements), 2 bullets: 2/2 action (reduced, led)=50, 2/2 quantified (30%, 5)=50 → 100
  assertEquals(score, 100);
});

Deno.test("contentQuality: empty achievements array → description fallback", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: [], description: "Did various tasks" }],
  });
  // 0 bullets, hasDesc=true → 15
  assertEquals(score, 15);
});

Deno.test("contentQuality: euro/pound symbols count as quantified", () => {
  const score = scoreContentQuality({
    experience: [{ achievements: [
      "Managed €500k budget",
      "Delivered £1M project",
    ] }],
  });
  // 2/2 action (managed, delivered) = 50, 2/2 quantified (€, £) = 50 → 100
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
