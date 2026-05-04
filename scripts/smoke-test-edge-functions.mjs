#!/usr/bin/env node
/**
 * Smoke-test the production edge functions for the most catastrophic
 * regressions: a function that didn't deploy, a function that crashes at
 * startup, a function whose CORS allow-list no longer permits the production
 * web origin, a router whose dispatch validation broke, or a function whose
 * auth gate stopped firing. Intended to be run unattended after every deploy
 * (see .github/workflows/deploy-edge-functions.yml).
 *
 * The script is fully unauthenticated. It only exercises:
 *   1. CORS preflight (OPTIONS) — must return 200/204 with
 *      Access-Control-Allow-Origin echoing the smoke-test origin and
 *      Access-Control-Allow-Methods containing POST.
 *   2. Multi-action router dispatch validation — POST with no body / unknown
 *      action must return 400 with the documented error message. Only
 *      applied to the three known multi-action routers (parse-job,
 *      admin-devkit-data, admin-email).
 *   3. Per-route auth enforcement — every function listed must return 401
 *      when called without a Bearer token (or, when the function's auth
 *      throw escapes wrapHandler, a 500 whose body still mentions
 *      authorization — see ALLOW_AUTH_LEAK_AS_500 below).
 *
 * It deliberately does NOT call any function with valid credentials, so it is
 * safe to run from CI / post-deploy hooks without secrets and without
 * burning AI credits or sending real emails.
 *
 * Coverage:
 *   - 36 admin-* functions (CORS + 401)
 *   - 6 high-traffic public functions (CORS + 401):
 *       parse-job (multi-action: url/text/linkedin), score-resume,
 *       analyze-resume, tailor-resume, generate-cover-letter, agentic-chat
 *   - 3 multi-action router dispatch validation suites:
 *       parse-job, admin-devkit-data, admin-email
 *
 * Adding a new function: append one entry to FUNCTIONS below. A single-action
 * function only needs `{ name: 'foo' }`. A multi-action router adds `routes`
 * and (optionally) `dispatchChecks`.
 *
 * Exit codes:
 *   0 — every check passed
 *   1 — at least one check failed (regression detected)
 *   2 — configuration / network error before any check could run
 *
 * Usage:
 *   node scripts/smoke-test-edge-functions.mjs
 *   SUPABASE_PROJECT_REF=<ref> node scripts/smoke-test-edge-functions.mjs
 *   EDGE_FUNCTIONS_BASE=https://<ref>.supabase.co/functions/v1 \
 *     node scripts/smoke-test-edge-functions.mjs
 *   SMOKE_TEST_CONCURRENCY=20 node scripts/smoke-test-edge-functions.mjs
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jnsfmkzgxsviuthaqlyy';
const BASE =
  process.env.EDGE_FUNCTIONS_BASE ||
  `https://${PROJECT_REF}.supabase.co/functions/v1`;

// An Origin that the shared cors.ts allow-list explicitly trusts so the
// preflight response includes Access-Control-Allow-Origin.
const ORIGIN = process.env.SMOKE_TEST_ORIGIN || 'https://resume.thewise.cloud';

const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_TEST_TIMEOUT_MS || 15000);
const CONCURRENCY = Math.max(1, Number(process.env.SMOKE_TEST_CONCURRENCY || 10));

// Default is STRICT: any 500 to an unauthenticated POST fails the smoke
// test. Functions whose auth gate is documented to leak `AuthError` past
// `wrapHandler` as 500 (e.g. parse-job/linkedin, score-resume) opt in
// per-route via `allowAuthLeakAs500: true`. When that opt-in is set, the
// 500 still has to carry an authorization-related message in the body —
// a bare 500 is always a fail because that means the function is crashing.
const ALLOW_AUTH_LEAK_AS_500_DEFAULT = false;

// ── Function catalogue ──────────────────────────────────────────────────────
//
// Each entry shape:
//   {
//     name: string,                   // edge function slug
//     routes?: Array<{                // omit for single-action: defaults to
//       label?: string,               //   one route with empty body and the
//       body?: object,                //   function name as label
//       allowAuthLeakAs500?: boolean, // override default per-route
//     }>,
//     dispatchChecks?: Array<{        // multi-action routers only
//       label: string,
//       body: object,
//       expectStatus: number,
//       expectErrorIncludes: string,
//     }>,
//   }

const ADMIN_FUNCTIONS = [
  // ── Merged routers (Tasks #51-54) ─────────────────────────────────────
  // Each merged router runs requireAdminAuth at the top of serve() before
  // dispatch, so unauthenticated POST → 401 regardless of dispatch header.
  'admin-ai-ops',     // merged: admin-ai-caps, admin-ai-routing, inspect-ai-keys, refresh-ai-test-models
  'admin-config',     // merged: admin-env-check, admin-feature-flags, admin-get-settings, admin-integrations, admin-update-settings
  'admin-user-ops',   // merged: admin-grant-trial, admin-revoke-sessions, admin-revoke-trial, admin-set-credits, admin-set-plan, admin-suspend-user, admin-update-profile
  'admin-wisehire',   // merged: admin-wisehire-invite, admin-wisehire-reset-user, admin-wisehire-revoke-invite, admin-wisehire-waitlist

  // ── Still-individual admin functions ──────────────────────────────────
  'admin-audit-logs',
  'admin-check-access',
  'admin-delete-user',
  // admin-devkit-data is multi-action — defined explicitly below.
  // admin-email is multi-action — defined explicitly below.
  'admin-get-identity',
  'admin-impersonate',
  'admin-kinde-reconcile',
  'admin-list-user-content',
  'admin-list-users',
  'admin-merge-identity',
  'admin-moderation',
  'admin-onboarding-funnel',
  'admin-owner-ops',
  'admin-portfolio-usernames',
  'admin-save-note',
];

const FUNCTIONS = [
  // ── Multi-action public router ──────────────────────────────────────────
  // parse-job dispatches on `action` BEFORE running per-branch auth, so the
  // 400 dispatch checks work without auth. The linkedin branch calls
  // requireAuth() outside its authErrorResponse() try/catch, so the
  // AuthError leaks out to wrapHandler and surfaces as 500 with
  // {"error":"internal_error","message":"Missing authorization header"}.
  // That is a code-quality issue, not a deploy regression — the route IS
  // live and IS gating unauthenticated requests. We accept both shapes.
  {
    name: 'parse-job',
    routes: [
      { body: { action: 'url' }, label: 'parse-job/url' },
      { body: { action: 'text' }, label: 'parse-job/text' },
      { body: { action: 'linkedin' }, label: 'parse-job/linkedin', allowAuthLeakAs500: true },
    ],
    dispatchChecks: [
      {
        label: 'parse-job rejects missing action',
        body: {},
        expectStatus: 400,
        expectErrorIncludes: 'action is required',
      },
      {
        label: 'parse-job rejects unknown action',
        body: { action: 'not-a-real-action' },
        expectStatus: 400,
        expectErrorIncludes: 'Unknown action',
      },
    ],
  },

  // ── Multi-action admin routers ──────────────────────────────────────────
  {
    name: 'admin-devkit-data',
    routes: [
      { body: { action: 'analytics' }, label: 'admin-devkit-data/analytics' },
      { body: { action: 'observability' }, label: 'admin-devkit-data/observability' },
      { body: { action: 'live-activity', resource: 'usage_events' }, label: 'admin-devkit-data/live-activity' },
      { body: { action: 'mission-control' }, label: 'admin-devkit-data/mission-control' },
      { body: { action: 'github-status' }, label: 'admin-devkit-data/github-status' },
    ],
    dispatchChecks: [
      {
        label: 'admin-devkit-data rejects missing action',
        body: {},
        expectStatus: 400,
        expectErrorIncludes: 'action is required',
      },
    ],
  },
  {
    name: 'admin-email',
    routes: [
      { body: { module: 'resend-stats', action: 'stats' }, label: 'admin-email/resend-stats' },
      { body: { module: 'resend-sync' }, label: 'admin-email/resend-sync' },
      { body: { module: 'email-actions', action: 'diagnose' }, label: 'admin-email/email-actions' },
      { body: { module: 'broadcast', action: 'list' }, label: 'admin-email/broadcast' },
    ],
    dispatchChecks: [
      {
        label: 'admin-email rejects missing module',
        body: {},
        expectStatus: 400,
        expectErrorIncludes: 'module is required',
      },
      {
        label: 'admin-email rejects unknown module',
        body: { module: 'not-a-real-module' },
        expectStatus: 400,
        expectErrorIncludes: 'Unknown module',
      },
    ],
  },

  // ── Coupons merged router (Task #48) ───────────────────────────────────
  // Dispatch is via x-coupons-action header, NOT body.action. Auth is
  // per-handler (not top-level), so a POST without the header returns a
  // 400 dispatch error rather than 401. We test the admin-manage sub-route
  // (which requires admin auth) using the dispatch header so the router
  // reaches its auth gate and returns 401 as expected.
  {
    name: 'coupons',
    routes: [
      {
        label: 'coupons/admin-manage',
        body: { action: 'list' },
        headers: { 'x-coupons-action': 'admin-manage' },
      },
    ],
  },

  // ── Single-action admin functions (auth-only) ───────────────────────────
  ...ADMIN_FUNCTIONS.map((name) => ({ name })),

  // ── High-traffic public functions ───────────────────────────────────────
  // All five funnel through requireAuth(); tailor-resume catches the
  // AuthError and returns the documented 401 envelope. The other four
  // call requireAuth() outside their authErrorResponse() try/catch, so
  // the AuthError leaks to wrapHandler and surfaces as 500 with
  // {"error":"internal_error","message":"Missing authorization header"}.
  // That is a known code-quality issue, not a deploy regression — the
  // routes ARE live and ARE gating unauthenticated requests. Opt them in
  // explicitly via allowAuthLeakAs500 so the smoke test stays green today
  // and tightens automatically if/when the requireAuth call is moved
  // inside the try/catch.
  {
    name: 'score-resume',
    routes: [{ label: 'score-resume', body: {}, allowAuthLeakAs500: true }],
  },
  {
    name: 'analyze-resume',
    routes: [{ label: 'analyze-resume', body: {}, allowAuthLeakAs500: true }],
  },
  { name: 'tailor-resume' },
  {
    name: 'generate-cover-letter',
    routes: [{ label: 'generate-cover-letter', body: {}, allowAuthLeakAs500: true }],
  },
  {
    name: 'agentic-chat',
    routes: [{ label: 'agentic-chat', body: {}, allowAuthLeakAs500: true }],
  },
];

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function timedFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function preflight(fn) {
  const res = await timedFetch(`${BASE}/${fn}`, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });
  return {
    status: res.status,
    acao: res.headers.get('access-control-allow-origin'),
    acam: res.headers.get('access-control-allow-methods'),
  };
}

async function postJson(fn, body, extraHeaders) {
  const res = await timedFetch(`${BASE}/${fn}`, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(extraHeaders || {}) },
    body: JSON.stringify(body ?? {}),
  });
  let parsed = null;
  const text = await res.text();
  try { parsed = JSON.parse(text); } catch { /* non-JSON response */ }
  return { status: res.status, body: parsed, raw: text };
}

// Run async tasks with bounded concurrency so we don't open 100 sockets at
// once but still finish in seconds rather than minutes.
async function runWithConcurrency(items, fn, limit = CONCURRENCY) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ── Result aggregation ──────────────────────────────────────────────────────

const results = [];
function record(label, ok, detail) {
  results.push({ label, ok, detail });
}
function flushSection(title, rows) {
  console.log(`\n${title}`);
  for (const r of rows) {
    const icon = r.ok ? 'PASS' : 'FAIL';
    const line = `  [${icon}] ${r.label}${r.detail ? ` — ${r.detail}` : ''}`;
    if (r.ok) console.log(line); else console.error(line);
  }
}

// ── Phase runners ───────────────────────────────────────────────────────────

async function runPreflightChecks() {
  const items = FUNCTIONS.map((f) => f.name);
  const rows = await runWithConcurrency(items, async (fn) => {
    const label = `${fn}: CORS preflight`;
    try {
      const { status, acao, acam } = await preflight(fn);
      const statusOk = status === 200 || status === 204;
      const acaoOk = acao === ORIGIN;
      const acamOk = !!acam && acam.toUpperCase().includes('POST');
      const ok = statusOk && acaoOk && acamOk;
      const detail = ok
        ? `${status} ${acao}`
        : `status=${status} acao=${acao || '(missing)'} methods=${acam || '(missing)'}`;
      const r = { label, ok, detail };
      record(label, ok, detail);
      return r;
    } catch (err) {
      const detail = `network error: ${err?.message || err}`;
      record(label, false, detail);
      return { label, ok: false, detail };
    }
  });
  flushSection(
    `[1/3] CORS preflight (OPTIONS) — ${items.length} functions must accept ${ORIGIN}`,
    rows,
  );
}

async function runDispatchChecks() {
  const items = [];
  for (const f of FUNCTIONS) {
    if (!f.dispatchChecks) continue;
    for (const c of f.dispatchChecks) items.push({ fn: f.name, ...c });
  }
  if (items.length === 0) return;

  const rows = await runWithConcurrency(items, async (c) => {
    try {
      const { status, body } = await postJson(c.fn, c.body);
      const statusOk = status === c.expectStatus;
      const errorMsg = body?.error || body?.message || '';
      const errorOk = String(errorMsg)
        .toLowerCase()
        .includes(c.expectErrorIncludes.toLowerCase());
      const ok = statusOk && errorOk;
      const detail = ok
        ? `${status} "${errorMsg}"`
        : `status=${status} expected=${c.expectStatus} error="${errorMsg}" expected~="${c.expectErrorIncludes}"`;
      const r = { label: c.label, ok, detail };
      record(c.label, ok, detail);
      return r;
    } catch (err) {
      const detail = `network error: ${err?.message || err}`;
      record(c.label, false, detail);
      return { label: c.label, ok: false, detail };
    }
  });
  flushSection(
    `[2/3] Top-level dispatch — ${items.length} multi-action 400-checks`,
    rows,
  );
}

function expandRoutes(f) {
  if (f.routes && f.routes.length > 0) {
    return f.routes.map((r) => ({
      fn: f.name,
      body: r.body ?? {},
      label: r.label || `${f.name}${r.body?.action ? `/${r.body.action}` : ''}`,
      allowAuthLeakAs500:
        r.allowAuthLeakAs500 ?? ALLOW_AUTH_LEAK_AS_500_DEFAULT,
      headers: r.headers || null,
    }));
  }
  return [{
    fn: f.name,
    body: {},
    label: f.name,
    allowAuthLeakAs500: ALLOW_AUTH_LEAK_AS_500_DEFAULT,
    headers: null,
  }];
}

async function runRouteAuthChecks() {
  const items = FUNCTIONS.flatMap(expandRoutes);
  const rows = await runWithConcurrency(items, async (r) => {
    try {
      const { status, body } = await postJson(r.fn, r.body, r.headers);
      // Each route's auth middleware throws/returns a 401 before doing any
      // real work. We accept either:
      //   - status=401 (the normal path: gateway-level JWT verify, or
      //     in-function requireAuth/requireAdminAuth);
      //   - status=500 with an authorization-related message in the body
      //     (the documented "AuthError leaked past wrapHandler" pattern,
      //     when allowAuthLeakAs500 is enabled — opt-in only; default is
      //     ALLOW_AUTH_LEAK_AS_500_DEFAULT = false).
      // A bare 500, a 404, or any 2xx is always a regression.
      const errorMsg = body?.error || '';
      const errorMsgFull = `${body?.error || ''} ${body?.message || ''}`.toLowerCase();
      const looksLikeAuthLeak =
        r.allowAuthLeakAs500 === true &&
        status === 500 &&
        (errorMsgFull.includes('authorization') || errorMsgFull.includes('unauthorized'));
      const ok = status === 401 || looksLikeAuthLeak;
      const visibleMsg = body?.message || errorMsg || '';
      const bodyExcerpt = JSON.stringify(body)?.slice(0, 160) || '(no body)';
      const detail = ok
        ? (looksLikeAuthLeak
            ? `500 (known auth-leak) "${visibleMsg}"`
            : `401 "${visibleMsg}"`)
        : `status=${status} expected=401 body=${bodyExcerpt}`;
      const row = { label: r.label, ok, detail };
      record(r.label, ok, detail);
      return row;
    } catch (err) {
      const detail = `network error: ${err?.message || err}`;
      record(r.label, false, detail);
      return { label: r.label, ok: false, detail };
    }
  });
  flushSection(
    `[3/3] Per-route auth — ${items.length} routes must return 401 (or 500-with-auth-message) when called without auth`,
    rows,
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[smoke-test-edge-functions] base: ${BASE}`);
  console.log(`[smoke-test-edge-functions] origin: ${ORIGIN}`);
  console.log(`[smoke-test-edge-functions] timeout: ${REQUEST_TIMEOUT_MS}ms`);
  console.log(`[smoke-test-edge-functions] concurrency: ${CONCURRENCY}`);
  console.log(`[smoke-test-edge-functions] coverage: ${FUNCTIONS.length} functions`);

  await runPreflightChecks();
  await runDispatchChecks();
  await runRouteAuthChecks();

  const failed = results.filter((r) => !r.ok);
  const passed = results.length - failed.length;
  console.log(`\n[smoke-test-edge-functions] ${passed}/${results.length} checks passed`);

  if (failed.length === 0) {
    console.log(
      `[smoke-test-edge-functions] OK — all ${FUNCTIONS.length} functions responded as expected.`,
    );
    process.exit(0);
  }

  console.error(`[smoke-test-edge-functions] FAIL — ${failed.length} check(s) failed:`);
  for (const f of failed) console.error(`  - ${f.label}: ${f.detail || '(no detail)'}`);
  console.error(
    '\nMost likely causes:\n' +
      '  - The deploy did not roll out one of the listed functions. Re-run the\n' +
      '    "Deploy Supabase Edge Functions" GitHub Actions workflow.\n' +
      '  - A function was renamed, removed, or its router shape changed without\n' +
      '    updating this smoke test (scripts/smoke-test-edge-functions.mjs).\n' +
      '  - CORS allow-list in supabase/functions/_shared/cors.ts no longer permits\n' +
      '    the SMOKE_TEST_ORIGIN value (default: https://resume.thewise.cloud).\n' +
      '  - A function is crashing at startup (returns 500 with no auth-related\n' +
      '    message). Check that function\'s logs in Supabase Dashboard.\n',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(`[smoke-test-edge-functions] unexpected error: ${err?.message || err}`);
  process.exit(2);
});
