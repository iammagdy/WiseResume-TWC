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
  /** Human name of the DevKit panel/tab the error fired in (e.g. "Mission Control"). */
  panel?: string;
  /** Appwrite Function name that returned the error (e.g. "admin-devkit-data"). */
  function?: string;
  /** Action string passed in the request body (e.g. "mission-control"). */
  action?: string;
  /** HTTP status returned by the function, if known. */
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
 * Standing directive appended to every AI prompt — names Appwrite as the
 * source of truth so the assistant never tries to "fix" the deployed runtime
 * by editing local-only files.
 */
const APPWRITE_DIRECTIVE =
  'IMPORTANT: production Appwrite (project ID 69fd362b001eb325a192, region fra) is the source of truth — verify the deployed Appwrite Function revision and the Appwrite Database collections before changing local code. Do NOT reference Supabase; it has been fully decommissioned.';

const PATTERNS: Pattern[] = [
  // ── Appwrite Function not found ───────────────────────────────────────────
  {
    test: (r) => /function with the requested id could not be found/i.test(r),
    build: (_raw, ) => ({
      humanMessage:
        'This Appwrite Function has not been deployed yet — the function ID does not exist in the Appwrite project.',
      hint:
        'Deploy the function via Appwrite Console → Functions (project 69fd362b001eb325a192, fra region). The source code lives in appwrite-hubs/<function-name>/ in this repository.',
      aiPromptHead:
        'An Appwrite Function call in my React app fails with "Function with the requested ID could not be found". The backend is Appwrite (project 69fd362b001eb325a192, fra region) — Supabase has been decommissioned. Help me create and deploy the missing Appwrite Function, starting from the source code in appwrite-hubs/ in my repo.',
    }),
  },

  // ── Resend restricted (send-only) key ────────────────────────────────────
  {
    test: (r) => /restricted_api_key|restricted \(send-only\)|restricted key/i.test(r),
    build: () => ({
      humanMessage:
        'The Resend API key configured in the Appwrite Function is a "restricted" send-only key — it can deliver emails but cannot list bounces or read send history.',
      hint:
        'In the Resend dashboard, create a new full-access (or read-enabled) API key, then update RESEND_API_KEY in Appwrite Console → Functions → admin-email → Variables and redeploy the function. No code change is required.',
      aiPromptHead:
        'My Appwrite Function is calling api.resend.com and getting 401 with `name:"restricted_api_key"`. The current RESEND_API_KEY set in Appwrite Function Variables is a send-only key. Walk me through generating a full-access Resend key and updating the Appwrite Function Variable without breaking outbound transactional emails.',
    }),
  },

  // ── Action not implemented in deployed function ──────────────────────────
  {
    test: (r) => /unknown action[: ]|action is required/i.test(r),
    build: () => ({
      humanMessage:
        'The deployed Appwrite Function does not recognise this action — the production revision is older than the committed source code.',
      hint:
        'Redeploy the relevant admin-* Appwrite Function (most commonly admin-devkit-data) so the new action handler ships to production. Source code is in appwrite-hubs/ in this repository.',
      aiPromptHead:
        'An Appwrite Function in my project is responding "Unknown action: …" for an action that exists in the committed source (appwrite-hubs/ directory). Help me redeploy the function via Appwrite Console or CLI and verify the new revision is live.',
    }),
  },

  // ── Edge function not deployed / unreachable ─────────────────────────────
  {
    test: (r) => /not deployed|failed to fetch|cannot reach the server|server error \(http 404\)/i.test(r),
    build: () => ({
      humanMessage:
        'The browser could not reach the Appwrite Function — it is either not deployed, not reachable from this network, or the Appwrite project endpoint is wrong.',
      hint:
        'Check Appwrite Console → Functions (project 69fd362b001eb325a192) to confirm the function is deployed, then verify VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID match.',
      aiPromptHead:
        'An Appwrite Function call in my React app fails with a transport error before it reaches the function code. The backend is Appwrite (project 69fd362b001eb325a192, fra region) — Supabase has been decommissioned. Help me confirm the function is deployed to the right project and that VITE_APPWRITE_ENDPOINT matches.',
    }),
  },

  // ── Missing / invalid DevKit session token ───────────────────────────────
  {
    test: (r) => /missing authorization header|jwt expired|invalid jwt|no authorization|unauthorized|http 401/i.test(r),
    build: () => ({
      humanMessage:
        'The Appwrite Function rejected the request — the DevKit session token is missing, expired, or incorrect.',
      hint:
        'Lock and re-unlock the DevKit session (use the "Lock Session" button in the sidebar), or check that DEVKIT_PASSWORD is set correctly in Appwrite Console → Functions → [function name] → Variables.',
      aiPromptHead:
        'An Appwrite Function returned a 401 / "Missing authorization header" / "Unauthorized" error from the DevKit admin panel. The function validates a Bearer token against a DEVKIT_PASSWORD variable. Help me trace why the token is not reaching the function or why it is being rejected.',
    }),
  },

  // ── Missing variable on the Appwrite Function runtime ────────────────────
  {
    test: (r) => /\bis not configured\b|env var .* (?:missing|not set)|missing secret/i.test(r),
    build: () => ({
      humanMessage:
        'A required environment variable is not set on the Appwrite Function runtime.',
      hint:
        'Open Appwrite Console → Functions → [function name] → Variables, add the variable named in the error, then redeploy the function so the new value is picked up.',
      aiPromptHead:
        'An Appwrite Function is reporting a missing environment variable. The backend is Appwrite (project 69fd362b001eb325a192) — secrets are stored as Appwrite Function Variables, not Supabase secrets. Help me identify which variable is required, set it in the Appwrite Console, and redeploy.',
    }),
  },

  // ── Appwrite Database "collection does not exist" ────────────────────────
  {
    test: (r) => /collection (with the (requested )?id )?could not be found|document (with the (requested )?id )?could not be found/i.test(r),
    build: () => ({
      humanMessage:
        'The Appwrite Function tried to access a Database collection or document that does not exist in the Appwrite project.',
      hint:
        'Check Appwrite Console → Databases to confirm the collection exists. The collection ID in the Function Variables may be wrong, or the collection may not have been created yet.',
      aiPromptHead:
        'An Appwrite Function is failing because an Appwrite Database collection or document could not be found (project 69fd362b001eb325a192). Help me verify the collection IDs configured in the Function Variables and confirm they match what is in the Appwrite Database.',
    }),
  },

  // ── Legacy Postgres / Supabase error surfacing ────────────────────────────
  {
    test: (r) => /(function|relation) [\w_.()]+ does not exist/i.test(r),
    build: () => ({
      humanMessage:
        'The function returned a PostgreSQL error — a Postgres function or table referenced in the code does not exist.',
      hint:
        'This error comes from a Postgres query inside the Appwrite Function. Check which database the function is querying and whether the schema is correct for the Appwrite-native data layer.',
      aiPromptHead:
        'An Appwrite Function is failing because a Postgres function/table is missing. The backend is Appwrite (project 69fd362b001eb325a192) — Supabase has been decommissioned. Help me identify what Postgres query is still running inside the function and migrate it to Appwrite Databases.',
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
    if (ctx.panel)    ctxLines.push(`- Panel: ${ctx.panel}`);
    if (ctx.function) ctxLines.push(`- Appwrite Function: ${ctx.function}`);
    if (ctx.action)   ctxLines.push(`- Action: ${ctx.action}`);
    if (ctx.httpStatus !== undefined && ctx.httpStatus !== null) {
      ctxLines.push(`- HTTP status: ${ctx.httpStatus}`);
    }
    if (ctx.requestBodySanitized) {
      ctxLines.push(`- Request body (sanitized): ${ctx.requestBodySanitized}`);
    }
    if (ctxLines.length) parts.push('Context:\n' + ctxLines.join('\n'));
  }
  parts.push(`Raw error: ${raw}`);
  parts.push(APPWRITE_DIRECTIVE);
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
