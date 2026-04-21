/**
 * Secret-redaction utility for any string that may end up in stderr or in
 * the JSON error envelope returned to the browser.
 *
 * Why: AI-5 / AI_AUDIT.md §5. Three concrete leak vectors prompted this:
 *   1. Gemini key smuggled into a fetch URL — a `TypeError: Failed to
 *      fetch` constructed by Deno often quotes the URL verbatim, including
 *      `?key=AIza…`.
 *   2. Provider error envelopes that echo the request body (sometimes the
 *      first ~1KB of resume JSON, sometimes the bearer token they
 *      complained about).
 *   3. Generic `console.error('XYZ API error', status, errorText)` lines
 *      that flow into our log aggregation.
 *
 * Design rules:
 *   - Pure function, idempotent — `scrub(scrub(x)) === scrub(x)`.
 *   - Replaces matched secrets with the literal token `[REDACTED]` so an
 *     operator grepping logs has a single, distinctive marker to count.
 *   - Never throws on malformed input; null/undefined → empty string.
 *   - Order matters: longer/more-specific patterns run before shorter
 *     prefix patterns so e.g. `sk-ant-…` is caught by the Anthropic rule
 *     and not by the OpenAI `sk-…` rule.
 */

const REDACTED = '[REDACTED]';

/**
 * Patterns are run in declaration order. Each pattern uses the global
 * flag so every occurrence in the input is replaced.
 *
 * The character classes are deliberately conservative:
 *   - `[A-Za-z0-9_\-]` covers every key shape we ship today.
 *   - We require a minimum length to avoid eating ordinary identifiers
 *     (e.g. an actual variable named `key` followed by `=2`).
 */
const PATTERNS: ReadonlyArray<{ name: string; re: RegExp; replace: string }> = [
  // Query-string `?key=…` / `&key=…` — Gemini before AI-5 sent its key here.
  // Replace ONLY the value, keep the `key=` so the redacted log still
  // makes structural sense.
  { name: 'qs_key', re: /([?&]key=)[A-Za-z0-9_\-]{16,}/g, replace: `$1${REDACTED}` },
  // Authorization headers / `Bearer xxxxx` strings.
  { name: 'bearer', re: /\bBearer\s+[A-Za-z0-9_\-.=]{12,}/gi, replace: `Bearer ${REDACTED}` },
  // Anthropic — must come BEFORE the OpenAI `sk-` rule (more specific prefix).
  { name: 'anthropic', re: /\bsk-ant-[A-Za-z0-9_\-]{16,}/g, replace: REDACTED },
  // OpenAI — `sk-…` (also matches `sk-proj-…`, `sk-svcacct-…`).
  { name: 'openai', re: /\bsk-[A-Za-z0-9_\-]{20,}/g, replace: REDACTED },
  // Groq — `gsk_…`.
  { name: 'groq', re: /\bgsk_[A-Za-z0-9]{20,}/g, replace: REDACTED },
  // xAI — `xai-…`.
  { name: 'xai', re: /\bxai-[A-Za-z0-9_\-]{20,}/g, replace: REDACTED },
  // Google — API keys are exactly 39 chars after `AIza`, but be permissive
  // (some demo keys / service-account tokens are longer).
  { name: 'google', re: /\bAIza[0-9A-Za-z_\-]{20,}/g, replace: REDACTED },
  // Slack bot tokens.
  { name: 'slack', re: /\bxox[abprs]-[A-Za-z0-9\-]{10,}/g, replace: REDACTED },
];

/**
 * Strip well-known API key shapes from `s`. Idempotent and safe on any
 * input (null, undefined, non-string).
 */
export function scrubSecrets(s: unknown): string {
  if (s == null) return '';
  let out = typeof s === 'string' ? s : String(s);
  for (const { re, replace } of PATTERNS) {
    out = out.replace(re, replace);
  }
  return out;
}

/**
 * Cap an upstream error message at `max` characters and run it through
 * `scrubSecrets`. Use this everywhere we forward provider error text into
 * `createAIError(...)` or `console.error`. Defaults to 100 chars per
 * AI_AUDIT.md §5 (long enough to keep the human-readable error class +
 * a short reason; short enough that a leaked key cannot fit even if the
 * scrubber misses a novel shape).
 */
export function scrubAndCap(s: unknown, max = 100): string {
  const scrubbed = scrubSecrets(s);
  if (scrubbed.length <= max) return scrubbed;
  return scrubbed.slice(0, max) + '…';
}

/** Sentinel string callers can search/log-grep for. Exported for tests. */
export const REDACTED_MARKER = REDACTED;
