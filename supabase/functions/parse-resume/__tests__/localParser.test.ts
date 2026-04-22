import {
  assertEquals,
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  extractDateRange,
  pickInstitutionLine,
  localParseResume,
} from "../localParser.ts";

// Run via:
//   deno test --allow-net --allow-env supabase/functions/parse-resume/__tests__/localParser.test.ts

Deno.test("extractDateRange — month-year ranges keep months", () => {
  assertEquals(extractDateRange("Jan 2021 – Jul 2024"), {
    startDate: "Jan 2021",
    endDate: "Jul 2024",
    current: false,
  });
  assertEquals(extractDateRange("January 2021 - July 2024"), {
    startDate: "January 2021",
    endDate: "July 2024",
    current: false,
  });
  assertEquals(extractDateRange("Mar 2020 to Present"), {
    startDate: "Mar 2020",
    endDate: "Present",
    current: true,
  });
});

Deno.test("extractDateRange — numeric formats", () => {
  assertEquals(extractDateRange("01/2021 - 03/2024").startDate, "01/2021");
  assertEquals(extractDateRange("01/2021 - 03/2024").endDate, "03/2024");
  assertEquals(extractDateRange("2021-01 to 2024-03").startDate, "2021-01");
  assertEquals(extractDateRange("2021-01 to 2024-03").endDate, "2024-03");
});

Deno.test("extractDateRange — falls back gracefully", () => {
  assertEquals(extractDateRange("").startDate, "");
  assertEquals(extractDateRange("no date here").startDate, "");
  // Bare year still works as a single date
  assertEquals(extractDateRange("Awarded in 2020").startDate, "2020");
});

Deno.test("extractDateRange — current sentinels", () => {
  for (const sentinel of ["Present", "Current", "Now", "Ongoing"]) {
    const r = extractDateRange(`Jan 2020 - ${sentinel}`);
    assertEquals(r.current, true, `${sentinel} should mark current`);
    assertEquals(r.endDate, "Present");
  }
});

Deno.test("pickInstitutionLine — prefers school keywords over first line", () => {
  // The audit's exact failure mode: PDF extraction puts a date or degree
  // line first and the institution comes later in the block.
  const lines = [
    "Bachelor of Science",
    "2018 - 2022",
    "Stanford University",
    "GPA 3.9",
  ];
  assertEquals(pickInstitutionLine(lines), "Stanford University");
});

Deno.test("pickInstitutionLine — picks 'Institute' / 'College' too", () => {
  assertEquals(
    pickInstitutionLine(["Diploma", "Massachusetts Institute of Technology", "2018"]),
    "Massachusetts Institute of Technology",
  );
  assertEquals(
    pickInstitutionLine(["Associate Degree", "Boston Community College"]),
    "Boston Community College",
  );
});

Deno.test("pickInstitutionLine — falls back to first capitalised line when no keywords", () => {
  // No "university/college/institute" keyword present — should still pick
  // the most capitalised line rather than a date or degree line.
  const result = pickInstitutionLine([
    "2018 - 2022",
    "École Polytechnique Fédérale",
    "Master in Engineering",
  ]);
  // The capitalised non-date line should win.
  assertEquals(result, "École Polytechnique Fédérale");
});

Deno.test("pickInstitutionLine — returns null for empty input", () => {
  assertEquals(pickInstitutionLine([]), null);
});

Deno.test("localParseResume — full integration: dates and institution survive fallback", () => {
  const resumeText = `
Jane Doe
jane@example.com
+1 555 1234

EXPERIENCE
Acme Corp
Senior Engineer
Jan 2021 - Present
Built and shipped the X platform.

EDUCATION
Bachelor of Science
2014 - 2018
Stanford University
`.trim();

  const parsed = localParseResume(resumeText);
  assertEquals(parsed.contactInfo.fullName, "Jane Doe");
  // Experience preserves month
  assertEquals(parsed.experience[0].startDate, "Jan 2021");
  assertEquals(parsed.experience[0].endDate, "Present");
  assertEquals(parsed.experience[0].current, true);
  // Education picks the institution by keyword, not first line
  assertEquals(parsed.education[0].institution, "Stanford University");
  assertStringIncludes(parsed.education[0].degree.toLowerCase(), "bachelor");
  assertEquals(parsed.education[0].startDate, "2014");
  assertEquals(parsed.education[0].endDate, "2018");
});

Deno.test("localParseResume — degree and institution are not the same line", () => {
  const text = `
EDUCATION
Bachelor of Science in Computer Science
Stanford University
2014 - 2018
`.trim();
  const parsed = localParseResume(text);
  assertEquals(parsed.education[0].institution, "Stanford University");
  assert(parsed.education[0].degree !== parsed.education[0].institution);
});
