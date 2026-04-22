/**
 * Output-quality validators for `enhance-section`.
 *
 * Why this exists
 * ───────────────
 * The companion audit (`docs/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md`)
 * flagged two server-side defects that produce bad data BEFORE the client even
 * sees the response:
 *
 *  - Silent entry-count drops on entry-array sections (e.g. AI returns 2 of 3
 *    experience entries → client merges and the third entry vanishes from
 *    `improved.length` checks). The audit's task #4 wants the function to
 *    return the same number of entries it received, OR re-prompt once, OR
 *    fail with a structured error code so the client can show a meaningful
 *    confirmation instead of guessing.
 *  - The "X in X" anti-echo guard is currently education-only — same shape
 *    of bug also shows up in experience (`position` echoed into `company`,
 *    e.g. "Senior Engineer at Senior Engineer") and projects
 *    (`name` echoed into `description`).
 *
 * The validators here are pure functions exported separately from the serve
 * handler so they can be unit-tested without any HTTP / AI plumbing. The
 * handler runs them after parsing the AI response and uses the output to
 * decide whether to retry, return a structured error, or strip an offending
 * field on a second failure.
 *
 * Sections covered
 * ────────────────
 * Entry-array sections — these have a 1:1 entry-count contract:
 *   experience, education, projects, certifications, awards,
 *   publications, volunteering, languages
 *
 * Non-array sections (summary, skills, contact, custom) intentionally skip
 * the count check. `skills` is a flat string[] and may legitimately add or
 * remove keywords.
 */

export const ENTRY_ARRAY_SECTIONS = [
  'experience',
  'education',
  'projects',
  'certifications',
  'awards',
  'publications',
  'volunteering',
  'languages',
] as const;

export type EntryArraySection = (typeof ENTRY_ARRAY_SECTIONS)[number];

export function isEntryArraySection(section: string): section is EntryArraySection {
  return (ENTRY_ARRAY_SECTIONS as readonly string[]).includes(section);
}

export interface CountValidation {
  ok: boolean;
  originalCount: number;
  improvedCount: number;
}

/**
 * Compares original vs improved entry counts for an entry-array section.
 *
 * - When the section is not an entry-array, returns `ok: true` (no contract).
 * - When `original` is not an array (e.g. single-project edit), returns
 *   `ok: true` — the 1:1 contract only applies to bulk array edits.
 * - Returns `ok: false` only when the AI returned **strictly fewer** entries
 *   than were sent in. Returning extra entries is allowed (the AI may add
 *   missing rows the user wanted) and is not a count failure.
 */
export function validateEntryCount(
  section: string,
  original: unknown,
  improved: unknown,
): CountValidation {
  if (!isEntryArraySection(section)) {
    return { ok: true, originalCount: 0, improvedCount: 0 };
  }
  if (!Array.isArray(original)) {
    // Single-entry edit (e.g. one project). Count contract doesn't apply.
    return { ok: true, originalCount: 0, improvedCount: 0 };
  }
  const originalCount = original.length;
  const improvedCount = Array.isArray(improved) ? improved.length : 0;
  return {
    ok: improvedCount >= originalCount,
    originalCount,
    improvedCount,
  };
}

export interface EchoIssue {
  /** Index into the array of entries (or 0 for single-entry edits). */
  index: number;
  /** The field that contains the echoed value. */
  field: string;
  /** The other field whose value was echoed into `field`. */
  echoedFrom: string;
  /** The (lowercased, trimmed) value that appears in both. */
  value: string;
}

function eq(a: unknown, b: unknown): boolean {
  // Treat empty strings as "not echoed" — if both fields are empty that is
  // not the bug we're guarding against. Compare case-insensitively and
  // trimmed so "HR " === " hr".
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const la = a.trim().toLowerCase();
  const lb = b.trim().toLowerCase();
  if (!la || !lb) return false;
  return la === lb;
}

function projectDescriptionEchoesName(name: unknown, description: unknown): boolean {
  // Two shapes seen in the wild:
  //   1) description === name (plain echo)
  //   2) description starts with "<Name>: <Name>" or "<Name> — <Name>"
  // We must regex-escape `name` BEFORE injecting it into the RegExp source —
  // real project names contain metacharacters (e.g. "C++", "Node.js (API)",
  // "App.* Refactor") and an unescaped value would either build a wrong
  // regex or throw at construction time. Wrapped in try/catch as a final
  // belt-and-braces against any pathological string.
  if (typeof name !== 'string' || typeof description !== 'string') return false;
  const ln = name.trim().toLowerCase();
  const ld = description.trim().toLowerCase();
  if (!ln || !ld) return false;
  if (ln === ld) return true;
  const escaped = ln.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const repeated = new RegExp(`${escaped}\\s*[:\\-–—]\\s*${escaped}`);
    return repeated.test(ld);
  } catch {
    return false;
  }
}

/**
 * Detect "X in X" / "<value> at <value>" / "<name>: <name>" echo patterns
 * across ALL entry-array sections. The handler uses this to decide whether
 * to re-prompt the AI once.
 *
 * The `improved` argument is the AI's `improved` payload — array for bulk
 * edits, single object for single-entry edits.
 */
export function detectEchoIssues(section: string, improved: unknown): EchoIssue[] {
  const issues: EchoIssue[] = [];
  const entries: unknown[] = Array.isArray(improved) ? improved : [improved];

  entries.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const e = raw as Record<string, unknown>;

    if (section === 'education') {
      // "BSc in BSc" / "Computer Science in Computer Science"
      if (eq(e.degree, e.field)) {
        issues.push({
          index,
          field: 'field',
          echoedFrom: 'degree',
          value: String(e.field).trim().toLowerCase(),
        });
      }
    } else if (section === 'experience') {
      // "Senior Engineer at Senior Engineer" — position echoed into company.
      if (eq(e.position, e.company)) {
        issues.push({
          index,
          field: 'company',
          echoedFrom: 'position',
          value: String(e.company).trim().toLowerCase(),
        });
      }
    } else if (section === 'projects') {
      // "Project Name: Project Name" — name echoed into description.
      if (projectDescriptionEchoesName(e.name, e.description)) {
        issues.push({
          index,
          field: 'description',
          echoedFrom: 'name',
          value: String(e.name).trim().toLowerCase(),
        });
      }
    } else if (section === 'awards') {
      // "Best Engineer 2024 by Best Engineer 2024" — title echoed into issuer.
      if (eq(e.title, e.issuer)) {
        issues.push({
          index,
          field: 'issuer',
          echoedFrom: 'title',
          value: String(e.issuer).trim().toLowerCase(),
        });
      }
    } else if (section === 'publications') {
      if (eq(e.title, e.publisher)) {
        issues.push({
          index,
          field: 'publisher',
          echoedFrom: 'title',
          value: String(e.publisher).trim().toLowerCase(),
        });
      }
    } else if (section === 'certifications') {
      if (eq(e.name, e.issuer)) {
        issues.push({
          index,
          field: 'issuer',
          echoedFrom: 'name',
          value: String(e.issuer).trim().toLowerCase(),
        });
      }
    } else if (section === 'volunteering') {
      if (eq(e.role, e.organization)) {
        issues.push({
          index,
          field: 'organization',
          echoedFrom: 'role',
          value: String(e.organization).trim().toLowerCase(),
        });
      }
    }
  });

  return issues;
}

/**
 * Strip the offending echoed field on the second failure (set it to ""),
 * so we still ship the rest of the entry rather than failing the apply.
 * The handler calls this only after one re-prompt has already failed.
 */
export function stripEchoFields(improved: unknown, issues: EchoIssue[]): unknown {
  if (!issues.length) return improved;
  if (Array.isArray(improved)) {
    const next = improved.map((e, i) => {
      const myIssues = issues.filter(x => x.index === i);
      if (!myIssues.length || !e || typeof e !== 'object') return e;
      const cleaned = { ...(e as Record<string, unknown>) };
      for (const issue of myIssues) cleaned[issue.field] = '';
      return cleaned;
    });
    return next;
  }
  if (improved && typeof improved === 'object') {
    const cleaned = { ...(improved as Record<string, unknown>) };
    for (const issue of issues) cleaned[issue.field] = '';
    return cleaned;
  }
  return improved;
}

/**
 * Build the addendum string we tack onto the prompt for the re-prompt pass.
 * Keeps the wording in one place so the unit tests can assert it.
 */
export function buildRetryAddendum(
  countIssue: CountValidation | null,
  echoIssues: EchoIssue[],
): string {
  const parts: string[] = [];
  if (countIssue && !countIssue.ok) {
    parts.push(
      `PREVIOUS RESPONSE DROPPED ENTRIES. You returned ${countIssue.improvedCount} entries but were given ${countIssue.originalCount}. Return EXACTLY ${countIssue.originalCount} entries this time, preserving every original "id" and never omitting an entry.`,
    );
  }
  if (echoIssues.length) {
    const summary = echoIssues
      .map(i => `entry #${i.index + 1}: "${i.field}" must not equal "${i.echoedFrom}"`)
      .join('; ');
    parts.push(
      `PREVIOUS RESPONSE ECHOED A FIELD INTO ANOTHER (e.g. "X in X"). Fix these and return distinct values: ${summary}. If you cannot supply a meaningfully different value, return an empty string for the offending field — never repeat the other field's value.`,
    );
  }
  return parts.length ? `\n\nRETRY INSTRUCTIONS — read carefully:\n${parts.join('\n')}` : '';
}
