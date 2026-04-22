/**
 * Shared helpers for applying an AI-edited array section back onto the
 * original resume.
 *
 * Why this exists
 * ───────────────
 * Every AI-driven sheet (AIEnhanceSheet, BoostAllExperienceSheet,
 * OnePageWizardSheet, RecruiterSimSheet, AgenticChatSheet, Tailor) has its
 * own copy of "merge AI's array of entries onto my originals". Those copies
 * drifted: some minted fresh UUIDs when the AI dropped the `id` field
 * (creating duplicate-looking rows), some silently dropped originals the AI
 * omitted (losing real user data), and some only merged by id (so an AI
 * that returned the entries in a different order without ids reshuffled
 * the resume).
 *
 * `mergeAIArrayResult` centralizes the contract:
 *  - Match each AI entry to an original by **(1) exact id**, then
 *    **(2) fuzzy fingerprint** (lowercased position + company + startDate
 *    for experience, institution + degree for education, etc.), then
 *    **(3) positional index**. Whichever match wins, the original's id
 *    is preserved — we never mint a new UUID for an in-place edit.
 *  - Preserve any original entry that the AI omitted; the caller decides
 *    whether to apply silently or to require explicit user confirmation
 *    via the returned `requiresConfirm` / `droppedCount` fields.
 *  - Merge each AI entry on top of its original (`{ ...orig, ...ai }`),
 *    so optional fields the AI omitted (e.g. `current`, `account`,
 *    `responsibilities`) carry through unchanged.
 *
 * The helper is intentionally generic: callers describe how to fingerprint
 * an entry for fuzzy matching and the helper does the rest.
 */

export type Fingerprint<T> = (entry: T) => string | null;

export interface MergeOptions<T extends { id?: string }> {
  /** Original resume section (e.g. `resume.experience`). */
  originals: T[];
  /** Whatever the AI returned for this section (assumed array; coerced if not). */
  aiEntries: unknown;
  /**
   * Optional fingerprint used as a fuzzy fallback when the AI omits the
   * `id` field. Returning `null` means "this entry has no usable
   * fingerprint" — the helper falls back to positional index.
   */
  fingerprint?: Fingerprint<T>;
  /**
   * Per-field defaults to backfill if the AI omitted them. Useful when the
   * AI tends to drop boolean flags (`current`) or arrays
   * (`achievements`, `responsibilities`).
   */
  fieldDefaults?: (orig: T | undefined) => Partial<T>;
}

export interface MergeResult<T> {
  /** The merged array, with original ids preserved and originals appended for any drops. */
  merged: T[];
  /** Number of originals the AI omitted and that were preserved by appending. */
  droppedCount: number;
  /**
   * `true` when the AI returned strictly fewer entries than originals.
   * Callers should require explicit user confirmation before mutating
   * the resume in that case.
   */
  requiresConfirm: boolean;
  /** Number of AI entries that were merged (equals `aiEntries.length`). */
  aiCount: number;
  /** Original count, for diagnostics / toast copy. */
  originalCount: number;
}

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/**
 * Build a default fingerprint that joins `keys` with `||` and lowercases.
 * Returns `null` when every selected field is empty so the caller falls
 * back to positional matching instead of grouping every blank entry.
 */
export function makeFingerprint<T extends Record<string, unknown>>(
  keys: (keyof T)[],
): Fingerprint<T> {
  return (entry) => {
    if (!entry) return null;
    const parts = keys.map(k => {
      const v = entry[k];
      return typeof v === 'string' ? v.trim().toLowerCase() : '';
    });
    if (parts.every(p => !p)) return null;
    return parts.join('||');
  };
}

/** Fingerprint defaults for the common section shapes. */
export const EXPERIENCE_FINGERPRINT = makeFingerprint<Record<string, unknown>>([
  'position', 'company', 'startDate',
]);
export const EDUCATION_FINGERPRINT = makeFingerprint<Record<string, unknown>>([
  'institution', 'degree', 'field',
]);
export const PROJECT_FINGERPRINT = makeFingerprint<Record<string, unknown>>([
  'name', 'role',
]);
export const GENERIC_NAME_FINGERPRINT = makeFingerprint<Record<string, unknown>>([
  'name', 'title',
]);

/**
 * Map AI output back onto the original array, preserving ids and never
 * silently dropping entries.
 */
export function mergeAIArrayResult<T extends { id?: string }>(
  opts: MergeOptions<T>,
): MergeResult<T> {
  const originals = Array.isArray(opts.originals) ? opts.originals : [];
  const aiArr = Array.isArray(opts.aiEntries) ? (opts.aiEntries as unknown[]) : [];
  const fp = opts.fingerprint;
  const fieldDefaults = opts.fieldDefaults ?? (() => ({} as Partial<T>));

  // Build lookup tables off the originals so each AI entry can claim its
  // best match in a single pass.
  const byId = new Map<string, { entry: T; index: number }>();
  const byFp = new Map<string, { entry: T; index: number }>();
  originals.forEach((orig, index) => {
    if (orig?.id) byId.set(orig.id, { entry: orig, index });
    if (fp) {
      const key = fp(orig);
      if (key && !byFp.has(key)) byFp.set(key, { entry: orig, index });
    }
  });

  const consumed = new Set<number>();
  const merged: T[] = [];

  aiArr.forEach((rawEntry, i) => {
    if (!isObj(rawEntry)) {
      // Non-object AI entry — keep the original at this index untouched
      // rather than corrupting the section with a string/number.
      const orig = originals[i];
      if (orig) {
        consumed.add(i);
        merged.push(orig);
      }
      return;
    }

    const aiEntry = rawEntry as Record<string, unknown> & { id?: string };

    // 1) Exact id match wins.
    let match: { entry: T; index: number } | undefined;
    if (typeof aiEntry.id === 'string' && aiEntry.id) {
      match = byId.get(aiEntry.id);
    }
    // 2) Fuzzy fingerprint fallback (only if not already consumed).
    if (!match && fp) {
      const key = fp(aiEntry as unknown as T);
      if (key) {
        const candidate = byFp.get(key);
        if (candidate && !consumed.has(candidate.index)) match = candidate;
      }
    }
    // 3) Positional fallback (only if the slot isn't already consumed).
    if (!match) {
      const orig = originals[i];
      if (orig && !consumed.has(i)) match = { entry: orig, index: i };
    }

    if (match) consumed.add(match.index);
    const orig = match?.entry;
    const defaults = fieldDefaults(orig);

    // Preserve original id; never mint a new UUID for an in-place edit.
    const mergedEntry: T = {
      ...(orig ?? ({} as T)),
      ...defaults,
      ...(aiEntry as unknown as Partial<T>),
      id: orig?.id ?? aiEntry.id ?? (orig as { id?: string } | undefined)?.id,
    } as T;

    merged.push(mergedEntry);
  });

  // Append every original the AI omitted so the user never silently loses
  // data. The caller decides via `requiresConfirm` whether to actually
  // commit this merged array without an explicit confirmation.
  const dropped: T[] = [];
  originals.forEach((orig, index) => {
    if (!consumed.has(index)) dropped.push(orig);
  });
  if (dropped.length) merged.push(...dropped);

  return {
    merged,
    droppedCount: dropped.length,
    requiresConfirm: aiArr.length < originals.length,
    aiCount: aiArr.length,
    originalCount: originals.length,
  };
}

/** Field-default builder for experience entries. */
export function experienceDefaults(orig: Record<string, unknown> | undefined): Record<string, unknown> {
  return {
    current: typeof orig?.current === 'boolean' ? orig.current : false,
    description: typeof orig?.description === 'string' ? orig.description : '',
    achievements: Array.isArray(orig?.achievements) ? orig.achievements : [],
    responsibilities: Array.isArray(orig?.responsibilities) ? orig.responsibilities : [],
  };
}

/** Field-default builder for education entries. */
export function educationDefaults(orig: Record<string, unknown> | undefined): Record<string, unknown> {
  return {
    institution: typeof orig?.institution === 'string' ? orig.institution : '',
    degree: typeof orig?.degree === 'string' ? orig.degree : '',
    field: typeof orig?.field === 'string' ? orig.field : '',
  };
}
