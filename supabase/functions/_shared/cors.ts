const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5000',      // Vite default (this project)
  'http://localhost:5173',      // Vite alternative port
  'http://localhost',           // Capacitor Android (legacy)
  'https://localhost',          // Capacitor Android v5+
  'capacitor://localhost',      // Capacitor iOS
  'https://resume.thewise.cloud',
  'https://thewise.cloud',
];

/**
 * AI-4 (Task #24): production must NEVER trust `*.replit.dev` blanket — any
 * Replit-hosted preview app could be coaxed (via a logged-in user's browser)
 * into invoking write endpoints with that user's JWT. The previous
 * implementation regex-matched `\.replit\.dev$` for any non-production
 * environment; we replace that with an explicit env-driven allow-list:
 *
 *   ALLOWED_DEV_ORIGINS  Comma-separated list of additional origins to
 *                        permit (e.g. "https://my-feature.replit.dev,
 *                        https://other-preview.replit.dev"). Empty by
 *                        default — opt-in only.
 *
 *   ALLOWED_ORIGIN       Single override (legacy; appended).
 *
 * The localhost / capacitor / native-app branches are unchanged.
 */
function parseDevOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_DEV_ORIGINS');
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return origin.startsWith('http://localhost') || origin.startsWith('https://localhost');
}

/**
 * True when the request has no Origin header at all (or the literal string
 * 'null' that Capacitor / WebView can produce). Used by write endpoints to
 * gate the x-client-info native-fallback path: webviews don't enforce CORS
 * and the platform header is the only signal we have.
 */
export function isNativeClient(origin: string | null | undefined): boolean {
  return !origin || origin === 'null';
}

/** Resolve the full effective allow-list for the current process. */
function resolveAllowedOrigins(): string[] {
  const origins = [...ALLOWED_ORIGINS];
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  if (allowedOrigin) origins.push(allowedOrigin);
  for (const dev of parseDevOrigins()) origins.push(dev);
  return origins;
}

/**
 * True when `origin` is allowed by the resolved CORS allow-list, the
 * localhost dev branch, or a native-app caller (no Origin header).
 *
 * Exported so write-action endpoints can perform an Origin check on top of
 * JWT auth — see `manage-api-keys/index.ts` (AI-4 / CSRF hardening matrix).
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (isNativeClient(origin)) return true;
  if (isLocalhostOrigin(origin)) return true;
  const origins = resolveAllowedOrigins();
  return !!origin && origins.includes(origin);
}

export const getCorsHeaders = (origin?: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-resume-section-ai-action, x-editor-ai-action, x-coupons-action, x-transactional-email-action, x-admin-user-op, x-admin-ai-op, x-admin-config-action, x-admin-wisehire-op',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };

  if (isOriginAllowed(origin)) {
    if (origin && origin !== 'null') {
      headers['Access-Control-Allow-Origin'] = origin;
    }
    // Native apps (no Origin / 'null' origin) don't need the ACAO header — webviews don't enforce CORS
  }

  return headers;
};
