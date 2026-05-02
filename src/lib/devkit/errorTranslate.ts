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

interface Pattern {
  test: (raw: string) => boolean;
  build: (raw: string) => TranslatedError;
}

const PATTERNS: Pattern[] = [
  // ── Resend restricted (send-only) key ────────────────────────────────────
  {
    test: (r) => /restricted_api_key|restricted \(send-only\)|restricted key/i.test(r),
    build: (raw) => ({
      humanMessage:
        'The Resend API key currently in Supabase is a "restricted" send-only key, so it can deliver emails but cannot list bounces or read send history.',
      hint:
        'In the Resend dashboard, create a new full-access (or read-enabled) API key, then replace RESEND_API_KEY in Supabase → Project Settings → Edge Functions → Secrets. No code change is required.',
      aiPrompt:
        'My Supabase Edge Functions are calling api.resend.com and getting 401 with `name:"restricted_api_key"`. The current RESEND_API_KEY is a send-only key. Walk me through generating a full-access Resend key and updating the Supabase Edge Function Secret without breaking outbound transactional emails. Raw error: ' +
        raw,
    }),
  },

  // ── Action not implemented in deployed function ──────────────────────────
  {
    test: (r) => /unknown action[: ]|action is required/i.test(r),
    build: (raw) => ({
      humanMessage:
        'The deployed edge function does not recognize this action — the production revision is older than the committed source code.',
      hint:
        'Redeploy the relevant admin-* Supabase Edge Function (most commonly admin-devkit-data) so the new action handler ships to production.',
      aiPrompt:
        'A Supabase Edge Function in my project is responding "Unknown action: …" for an action that exists in the committed source. Help me redeploy the function with the Supabase CLI and verify the new revision is live. Raw error: ' +
        raw,
    }),
  },

  // ── Edge function not deployed / unreachable ─────────────────────────────
  {
    test: (r) => /not deployed|failed to fetch|cannot reach the server|server error \(http 404\)/i.test(r),
    build: (raw) => ({
      humanMessage:
        'The browser could not reach the Supabase Edge Function — it is either not deployed, not reachable from this network, or the project URL is wrong.',
      hint:
        'Check Supabase → Edge Functions to confirm the function is deployed, then verify VITE_SUPABASE_URL points at the same project.',
      aiPrompt:
        'A Supabase Edge Function call in my React app fails with a transport error before it reaches my function code. Help me confirm the function is deployed to the right project and that VITE_SUPABASE_URL matches. Raw error: ' +
        raw,
    }),
  },

  // ── Missing authorization header ─────────────────────────────────────────
  {
    test: (r) => /missing authorization header|jwt expired|invalid jwt|no authorization/i.test(r),
    build: (raw) => ({
      humanMessage:
        'The edge function expected an Authorization header but the call was made without one (or with an expired token).',
      hint:
        'Either call the function via the authenticated edgeFunctions client (which attaches the Supabase bridge JWT) or sign back in to refresh the token.',
      aiPrompt:
        'A Supabase Edge Function returned "Missing authorization header" / "JWT expired". Help me trace the call site that is bypassing my authenticated client and either route it through the bridge or re-authenticate. Raw error: ' +
        raw,
    }),
  },

  // ── Missing secret on the edge runtime ───────────────────────────────────
  {
    test: (r) => /\bis not configured\b|env var .* (?:missing|not set)|missing secret/i.test(r),
    build: (raw) => ({
      humanMessage:
        'A required environment variable is not set on the Supabase Edge Function runtime.',
      hint:
        'Open Supabase → Project Settings → Edge Functions → Secrets and add the secret named in the error, then redeploy the function so the new value is picked up.',
      aiPrompt:
        'A Supabase Edge Function is reporting a missing environment variable. Help me identify which secret is required, set it in the Supabase dashboard, and redeploy. Raw error: ' +
        raw,
    }),
  },

  // ── Postgres "function does not exist" / "relation does not exist" ───────
  {
    test: (r) => /(function|relation) [\w_.()]+ does not exist/i.test(r),
    build: (raw) => ({
      humanMessage:
        'The edge function tried to call a Postgres function or table that does not exist in the production database.',
      hint:
        'A migration is missing in production. Apply the relevant SQL migration to the production Supabase project.',
      aiPrompt:
        'A Supabase Edge Function is failing because a Postgres function/table is missing in the production database. Help me find the missing migration in supabase/migrations and apply it safely. Raw error: ' +
        raw,
    }),
  },
];

const FALLBACK: TranslatedError = {
  humanMessage: 'Something went wrong while talking to the backend.',
  hint:
    'Open the raw error below for details, or copy the AI fix prompt and paste it into Replit Agent / Cursor.',
  aiPrompt:
    'A DevKit panel in my app threw the following error. Help me find the root cause and fix it. Raw error: ',
};

export function translateError(raw: string | null | undefined): TranslatedError {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return FALLBACK;
  for (const p of PATTERNS) {
    if (p.test(trimmed)) return p.build(trimmed);
  }
  return { ...FALLBACK, aiPrompt: FALLBACK.aiPrompt + trimmed };
}
