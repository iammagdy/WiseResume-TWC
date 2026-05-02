/**
 * Translate raw DevKit / edge-function error strings into a friendly
 * `{ humanMessage, hint, aiPrompt }` triple that DevKitErrorCard renders.
 *
 * Add new patterns here as they show up in production — the goal is that
 * NO raw error string is ever shown to an admin without a plain-English
 * translation alongside it.
 */

export interface TranslatedError {
  /** One-sentence plain-English description of what went wrong. */
  humanMessage: string;
  /** Concrete next step the admin can take. */
  hint: string;
  /** Pre-built prompt the admin can paste into Replit Agent / Cursor / etc. */
  aiPrompt: string;
}

/**
 * Optional structured context every panel can pass so the copied AI prompt
 * is actionable and includes the exact deployed surface area.
 */
export interface ErrorContext {
  /** Human name of the DevKit panel/tab the error fired in (e.g. "AI Cost"). */
  panel?: string;
  /** Supabase Edge Function name that returned the error (e.g. "admin-devkit-data"). */
  function?: string;
  /** Action string passed in the request body (e.g. "ai-cost"). */
  action?: string;
  /** HTTP status returned by the edge function, if known. */
  httpStatus?: number | null;
  /**
   * Sanitized request body. Pass only safe fields — never tokens or PII.
   * The string is included verbatim in the AI prompt.
   */
  requestBodySanitized?: string;
}

interface Pattern {
  test: (raw: string) => boolean;
  build: (raw: string) => Pick<TranslatedError, 'humanMessage' | 'hint'> & { aiPromptHead: string };
}

/**
 * Standing directive appended to every AI prompt — names production
 * Supabase as the source of truth so the assistant never tries to "fix"
 * the deployed runtime by editing local-only files.
 */
const SUPABASE_DIRECTIVE =
  'IMPORTANT: production Supabase (project ref jnsfmkzgxsviuthaqlyy) is the source of truth — verify the deployed Edge Function revision and the prod database before changing local code.';

const PATTERNS: Pattern[] = [
  // ── Resend restricted (send-only) key ────────────────────────────────────
  {
    test: (r) => /restricted_api_key|restricted \(send-only\)|restricted key/i.test(r),
    build: () => ({
      humanMessage:
        'The Resend API key currently in Supabase is a "restricted" send-only key, so it can deliver emails but cannot list bounces or read send history.',
      hint:
        'In the Resend dashboard, create a new full-access (or read-enabled) API key, then replace RESEND_API_KEY in Supabase → Project Settings → Edge Functions → Secrets. No code change is required.',
      aiPromptHead:
        'My Supabase Edge Functions are calling api.resend.com and getting 401 with `name:"restricted_api_key"`. The current RESEND_API_KEY is a send-only key. Walk me through generating a full-access Resend key and updating the Supabase Edge Function Secret without breaking outbound transactional emails.',
    }),
  },

  // ── Action not implemented in deployed function ──────────────────────────
  {
    test: (r) => /unknown action[: ]|action is required/i.test(r),
    build: () => ({
      humanMessage:
        'The deployed edge function does not recognize this action — the production revision is older than the committed source code.',
      hint:
        'Redeploy the relevant admin-* Supabase Edge Function (most commonly admin-devkit-data) so the new action handler ships to production.',
      aiPromptHead:
        'A Supabase Edge Function in my project is responding "Unknown action: …" for an action that exists in the committed source. Help me redeploy the function with the Supabase CLI and verify the new revision is live.',
    }),
  },

  // ── Edge function not deployed / unreachable ─────────────────────────────
  {
    test: (r) => /not deployed|failed to fetch|cannot reach the server|server error \(http 404\)/i.test(r),
    build: () => ({
      humanMessage:
        'The browser could not reach the Supabase Edge Function — it is either not deployed, not reachable from this network, or the project URL is wrong.',
      hint:
        'Check Supabase → Edge Functions to confirm the function is deployed, then verify VITE_SUPABASE_URL points at the same project.',
      aiPromptHead:
        'A Supabase Edge Function call in my React app fails with a transport error before it reaches my function code. Help me confirm the function is deployed to the right project and that VITE_SUPABASE_URL matches.',
    }),
  },

  // ── Missing authorization header ─────────────────────────────────────────
  {
    test: (r) => /missing authorization header|jwt expired|invalid jwt|no authorization/i.test(r),
    build: () => ({
      humanMessage:
        'The edge function expected an Authorization header but the call was made without one (or with an expired token).',
      hint:
        'Either call the function via the authenticated edgeFunctions client (which attaches the Supabase bridge JWT) or sign back in to refresh the token.',
      aiPromptHead:
        'A Supabase Edge Function returned "Missing authorization header" / "JWT expired". Help me trace the call site that is bypassing my authenticated client and either route it through the bridge or re-authenticate.',
    }),
  },

  // ── Missing secret on the edge runtime ───────────────────────────────────
  {
    test: (r) => /\bis not configured\b|env var .* (?:missing|not set)|missing secret/i.test(r),
    build: () => ({
      humanMessage:
        'A required environment variable is not set on the Supabase Edge Function runtime.',
      hint:
        'Open Supabase → Project Settings → Edge Functions → Secrets and add the secret named in the error, then redeploy the function so the new value is picked up.',
      aiPromptHead:
        'A Supabase Edge Function is reporting a missing environment variable. Help me identify which secret is required, set it in the Supabase dashboard, and redeploy.',
    }),
  },

  // ── Postgres "function does not exist" / "relation does not exist" ───────
  {
    test: (r) => /(function|relation) [\w_.()]+ does not exist/i.test(r),
    build: () => ({
      humanMessage:
        'The edge function tried to call a Postgres function or table that does not exist in the production database.',
      hint:
        'A migration is missing in production. Apply the relevant SQL migration to the production Supabase project.',
      aiPromptHead:
        'A Supabase Edge Function is failing because a Postgres function/table is missing in the production database. Help me find the missing migration in supabase/migrations and apply it safely.',
    }),
  },
];

const FALLBACK_BUILD = () => ({
  humanMessage: 'Something went wrong while talking to the backend.',
  hint:
    'Open the raw error below for details, or copy the AI fix prompt and paste it into Replit Agent / Cursor.',
  aiPromptHead:
    'A DevKit panel in my app threw an unrecognized error. Help me find the root cause and fix it.',
});

function buildAIPrompt(head: string, raw: string, ctx?: ErrorContext): string {
  const parts: string[] = [head];
  if (ctx) {
    const ctxLines: string[] = [];
    if (ctx.panel) ctxLines.push(`- Panel: ${ctx.panel}`);
    if (ctx.function) ctxLines.push(`- Edge function: ${ctx.function}`);
    if (ctx.action) ctxLines.push(`- Action: ${ctx.action}`);
    if (ctx.httpStatus !== undefined && ctx.httpStatus !== null) {
      ctxLines.push(`- HTTP status: ${ctx.httpStatus}`);
    }
    if (ctx.requestBodySanitized) {
      ctxLines.push(`- Request body (sanitized): ${ctx.requestBodySanitized}`);
    }
    if (ctxLines.length) parts.push('Context:\n' + ctxLines.join('\n'));
  }
  parts.push(`Raw error: ${raw}`);
  parts.push(SUPABASE_DIRECTIVE);
  return parts.join('\n\n');
}

export function translateError(
  raw: string | null | undefined,
  ctx?: ErrorContext,
): TranslatedError {
  const trimmed = (raw ?? '').trim();
  const matched = trimmed
    ? PATTERNS.find((p) => p.test(trimmed))?.build(trimmed) ?? FALLBACK_BUILD()
    : FALLBACK_BUILD();
  return {
    humanMessage: matched.humanMessage,
    hint: matched.hint,
    aiPrompt: buildAIPrompt(matched.aiPromptHead, trimmed || '(empty)', ctx),
  };
}
