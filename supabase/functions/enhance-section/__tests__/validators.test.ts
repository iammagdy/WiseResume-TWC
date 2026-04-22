import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  buildRetryAddendum,
  detectEchoIssues,
  isEntryArraySection,
  stripEchoFields,
  validateEntryCount,
} from "../validators.ts";

// Run via:
//   deno test --allow-net --allow-env supabase/functions/enhance-section/__tests__/validators.test.ts

Deno.test("validateEntryCount — entry-array sections enforce 1:1", () => {
  const orig = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const dropped = [{ id: "a" }, { id: "b" }];
  const same = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const extra = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  const v1 = validateEntryCount("experience", orig, dropped);
  assertEquals(v1.ok, false);
  assertEquals(v1.originalCount, 3);
  assertEquals(v1.improvedCount, 2);

  const v2 = validateEntryCount("experience", orig, same);
  assertEquals(v2.ok, true);

  const v3 = validateEntryCount("experience", orig, extra);
  assertEquals(v3.ok, true, "extra entries are allowed (AI may add new rows)");
});

Deno.test("validateEntryCount — non-array sections always pass", () => {
  const v = validateEntryCount("summary", "old summary", "new summary");
  assertEquals(v.ok, true);
});

Deno.test("validateEntryCount — single-entry edits skip the contract", () => {
  // Editing one project at a time — currentContent is an object, not an array.
  const v = validateEntryCount("projects", { id: "x", name: "Foo" }, { id: "x", name: "Foo" });
  assertEquals(v.ok, true);
});

Deno.test("isEntryArraySection — covers the audit's targets", () => {
  for (const s of ["experience", "education", "projects", "certifications", "awards", "publications", "volunteering", "languages"]) {
    assertEquals(isEntryArraySection(s), true, `${s} should be entry-array`);
  }
  for (const s of ["summary", "skills", "contact", "custom"]) {
    assertEquals(isEntryArraySection(s), false, `${s} should NOT be entry-array`);
  }
});

Deno.test("detectEchoIssues — experience: position echoed into company", () => {
  const improved = [
    { id: "a", position: "Senior Engineer", company: "Senior Engineer" },
    { id: "b", position: "Manager", company: "Acme Corp" },
  ];
  const issues = detectEchoIssues("experience", improved);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].index, 0);
  assertEquals(issues[0].field, "company");
  assertEquals(issues[0].echoedFrom, "position");
});

Deno.test("detectEchoIssues — projects: name echoed into description", () => {
  const improved = [
    { id: "a", name: "Resume Builder", description: "Resume Builder" },
    { id: "b", name: "Tax App", description: "Tax App: Tax App built with React" },
    { id: "c", name: "Real Project", description: "A genuine description of the project's impact" },
  ];
  const issues = detectEchoIssues("projects", improved);
  assertEquals(issues.length, 2);
  assertEquals(issues.map(i => i.index).sort(), [0, 1]);
});

Deno.test("detectEchoIssues — education echo still detected (regression)", () => {
  const improved = [{ id: "a", degree: "BSc", field: "BSc" }];
  const issues = detectEchoIssues("education", improved);
  assertEquals(issues.length, 1);
  assertEquals(issues[0].field, "field");
  assertEquals(issues[0].echoedFrom, "degree");
});

Deno.test("detectEchoIssues — case-insensitive and whitespace-tolerant", () => {
  const issues = detectEchoIssues("experience", [
    { id: "a", position: "  HR  ", company: "hr" },
  ]);
  assertEquals(issues.length, 1);
});

Deno.test("detectEchoIssues — empty fields don't false-positive", () => {
  const issues = detectEchoIssues("experience", [
    { id: "a", position: "", company: "" },
  ]);
  assertEquals(issues.length, 0);
});

Deno.test("stripEchoFields — sets offending field to empty string", () => {
  const improved = [
    { id: "a", position: "Senior Engineer", company: "Senior Engineer" },
    { id: "b", position: "Manager", company: "Acme Corp" },
  ];
  const issues = detectEchoIssues("experience", improved);
  const cleaned = stripEchoFields(improved, issues) as Array<Record<string, unknown>>;
  assertEquals(cleaned[0].company, "");
  assertEquals(cleaned[0].position, "Senior Engineer");
  assertEquals(cleaned[1].company, "Acme Corp");
});

Deno.test("buildRetryAddendum — describes count + echo issues", () => {
  const addendum = buildRetryAddendum(
    { ok: false, originalCount: 3, improvedCount: 2 },
    [{ index: 0, field: "company", echoedFrom: "position", value: "x" }],
  );
  assertStringIncludes(addendum, "RETRY INSTRUCTIONS");
  assertStringIncludes(addendum, "EXACTLY 3 entries");
  assertStringIncludes(addendum, '"company" must not equal "position"');
});

Deno.test("buildRetryAddendum — empty when nothing is wrong", () => {
  assertEquals(buildRetryAddendum(null, []), "");
});

Deno.test("detectEchoIssues — project names with regex metacharacters do not throw", () => {
  // Real project names contain "+", ".", "(", ")" etc. The regex builder
  // inside projectDescriptionEchoesName must escape these or it will
  // either misfire or throw at construction time.
  for (const name of ["C++ Compiler", "Node.js (API)", "App.* Refactor", "[Beta] Tool"]) {
    const issues = detectEchoIssues("projects", [
      { id: "a", name, description: "A real description with no echo" },
    ]);
    assertEquals(issues.length, 0, `should not flag legitimate description for ${name}`);

    const echoed = detectEchoIssues("projects", [
      { id: "a", name, description: name },
    ]);
    assertEquals(echoed.length, 1, `should flag exact echo for ${name}`);
  }
});

Deno.test("detectEchoIssues — awards / publications / certifications / volunteering", () => {
  assertEquals(
    detectEchoIssues("awards", [{ id: "a", title: "Best Engineer", issuer: "Best Engineer" }]).length,
    1,
  );
  assertEquals(
    detectEchoIssues("publications", [{ id: "a", title: "On AI", publisher: "On AI" }]).length,
    1,
  );
  assertEquals(
    detectEchoIssues("certifications", [{ id: "a", name: "AWS SAA", issuer: "AWS SAA" }]).length,
    1,
  );
  assertEquals(
    detectEchoIssues("volunteering", [{ id: "a", role: "Mentor", organization: "Mentor" }]).length,
    1,
  );
  // And no false positive when fields differ
  assertEquals(
    detectEchoIssues("awards", [{ id: "a", title: "Best Engineer", issuer: "ACM" }]).length,
    0,
  );
});
