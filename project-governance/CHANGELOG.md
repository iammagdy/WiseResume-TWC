# CHANGELOG

Local changelog tracking WiseResume changes.

## 2026-04-29 (Task #20 — Cap autosave drafts at the same size limit as publish)

### Changed
- **Hoisted the publish-side `EXTRAS_MAX_BYTES` constant in `src/pages/PortfolioEditorPage.tsx` from a function-local in `handleSave` to a module-scope `PORTFOLIO_EXTRAS_MAX_BYTES = 200_000`.** Previously the 200 KB byte budget for the `portfolio_extras` JSONB column lived as a `const` inside the publish handler (~line 859), and there was no equivalent guard on the autosave path that writes to `portfolio_draft`. Sharing one constant makes it impossible for the two limits to drift in the future — change the budget once and both enforcement points pick it up. The publish-side comparison in `handleSave` and the new autosave-side comparison both reference the same exported constant. The existing publish-side toast wording is unchanged (still says "Portfolio content is too large…") because the failure mode there is *blocking* (the publish was rejected) and the user is actively at the publish action; the autosave-side toast uses different language because the failure mode is *non-blocking* (in-memory edits survive — only the cross-session draft is skipped).

### Added
- **Autosave size guard inside the debounced `useEffect` at the top of `PortfolioEditorPage`.** The autosave was previously uncapped — a user with a runaway translations or case-studies blob could spam multi-megabyte writes to `portfolio_draft` on every 3-second debounce window, surviving across sessions and only learning the data was too big at publish time, far from where they introduced the problem. The new guard sits inside the `setTimeout` callback, *after* the existing dedup checks (so we don't pay the cost when the snapshot hasn't changed) and *before* the `JSON.parse` + Supabase write. If `currentSnapshot.length > PORTFOLIO_EXTRAS_MAX_BYTES` it returns early — the network write is skipped, the in-memory editor state is left completely untouched (the user keeps every byte of their work), and `lastDraftPersistedSnapshotRef` is intentionally *not* advanced so a future trim that brings the snapshot back under the budget will autosave normally on the next 3-s window. We measure the whole serialized snapshot rather than just the extras-equivalent fields because the runaway-blob-prone fields (`caseStudies`, `services`, `testimonials`, `highlights`, `portfolioTranslations`, `portfolioCertifications`) all live inside `getCurrentSnapshot()`'s JSON and dominate the byte count — the small scalars (username, bio, URLs) add only a few hundred bytes of overhead, well within the 200 KB budget's headroom. This is consistent with how the publish path measures `portfolioExtras` rather than the whole upserted profile row.
- **Once-per-session `toast.warning` for autosave overflow gated by a new `draftOverflowToastedRef = useRef(false)`.** The user gets exactly one non-blocking warning per editor session naming the actual size and the cap (e.g. "Draft is too large to autosave (243 KB / 195 KB max). Your edits are still here, but they won't be restored after a refresh until you trim some services, case studies, testimonials, or translations."). The toast is dismissable, lasts 8 seconds (longer than the default 4 s because it's an information-dense message), and uses `toast.warning` (yellow/amber) rather than `toast.error` (red) to signal the non-blocking severity. The ref resets on full unmount of the editor page, so navigating away and coming back gives the user a fresh chance to be warned — but typing for 30 minutes straight inside one session won't fire the toast 600 times.

### Behaviour preserved
- **In-memory editor state is never touched on overflow.** This is the load-bearing requirement from the task plan: the user must be able to keep editing, see their content render in the live preview, and recover from the overflow by trimming a section. The autosave guard returns *before* any state-mutating call (no `setX`, no `queryClient.setQueriesData`, no `setSavingPortfolio`), so the only observable effect of an overflow is the toast and the absence of a `portfolio_draft` write that 3-second window.
- **Publish path is unchanged.** The `handleSave` size guard still rejects the entire publish with `toast.error` and `setSavingPortfolio(false)` when the *extras* blob alone exceeds the budget — same comparison operator, same `JSON.stringify(...).length` measurement, same toast wording, same `setSavingPortfolio(false) → return` flow. The only line that moved is the constant reference (`EXTRAS_MAX_BYTES` → `PORTFOLIO_EXTRAS_MAX_BYTES`) so both the publish guard and the new autosave guard read from one source of truth. The two guards measure different things on purpose: publish enforces "the extras blob you're about to commit is too big" (blocking — refuse the write), autosave enforces "the draft snapshot is too big to safely persist between sessions" (non-blocking — keep working, just no draft restore).
- **The autosave guard uses the same `.length` measurement as the publish guard.** This is intentional drift prevention: if a future ticket switches to byte-accurate `new Blob([...]).size` for hard parity with the Postgres JSONB byte limit, *both* guards must change together. The pre-existing post-publish translation guard already uses `Blob().size`; that drift pre-dates this task and is filed as part of follow-up #23 (server-side enforcement is the right place to standardise on byte-accurate measurement, since that's where the limit truly lives).
- **The dedup ref `lastDraftPersistedSnapshotRef` is not advanced on overflow.** This means an overflow-triggered skip will re-evaluate on the next snapshot change, which is the desired behaviour — if the user trims content and brings the snapshot back under budget, the very next 3-s debounce window writes the new draft normally. (Cost of re-evaluation is one `JSON.stringify` + one `.length` read; no network, no parse.)
- **The autosave's outer effect deps and the debounce timing are unchanged.** Same 3000 ms `setTimeout`, same `[getCurrentSnapshot, lastSavedSnapshot]` deps with the eslint-disable, same cleanup `clearTimeout`. The size guard is purely additive.
- **Browser close/refresh warning, in-app navigation guard, and the `lastSavedSnapshot` advancement on publish are all untouched.** A user who has unsaved-and-too-big content gets the same beforeunload warning they get for any unsaved content — the autosave overflow doesn't suppress it.

### Out of scope (per task plan)
- **Server-side enforcement.** Both `portfolio_draft` and `portfolio_extras` columns ultimately need a Postgres check constraint or RPC-side guard so a malicious or buggy client can't bypass the JS limit and write a 50 MB JSONB row. Filed as follow-up #23.
- **Auto-trimming or compressing the payload.** The product decision is to surface the problem to the user and let them choose what to remove, not to silently drop fields.
- **Phase 5 public-page polish** (already shipped under Task #14).

### Verification
- `npx tsc --noEmit` clean across the repo (no new type errors from the hoisted constant or the new ref).
- `rg PORTFOLIO_EXTRAS_MAX_BYTES src/pages/PortfolioEditorPage.tsx` confirms exactly one declaration (module scope) and two usages (publish + autosave) — no orphan local `EXTRAS_MAX_BYTES` constant remains.
- Workflow restart shows clean React + API boot — no console errors, Sentry active, app bundle hot-reloads correctly.
- Manual reasoning: the autosave guard is purely additive and only short-circuits *before* the existing write path, so the existing happy-path tests (autosave fires on edit, dedup skips identical snapshots, draft restoration on next load) are not affected.

**Files changed:** `src/pages/PortfolioEditorPage.tsx`, `project-governance/CHANGELOG.md`.

**Deployment:** frontend-only change; ships with the next Hostinger build. No database migration, no edge function redeploy, no env var change.

---

## 2026-04-29 (Task #19 — Migrate DeepSeek to v4-flash and harden the client)

### Changed
- **DeepSeek model ID swapped from `deepseek-chat` to `deepseek-v4-flash` in every code path that touches the DeepSeek API.** DeepSeek announced that `deepseek-chat` and `deepseek-reasoner` are deprecated on **2026/07/24**; per their docs, `deepseek-v4-flash` is the *same engine* as `deepseek-chat` with thinking mode disabled — same response shape, same pricing, same latency profile. Updated five files: `supabase/functions/_shared/aiClient.ts` (`DEEPSEEK_MODEL` constant used by the pool path), `supabase/functions/_shared/providers.ts` (`PROVIDERS.deepseek.defaultModel` used by the BYOK path and `pingProvider`), `supabase/functions/ai-test/index.ts` (admin-pinned DeepSeek test), `supabase/functions/inspect-ai-keys/index.ts` (the model name surfaced in the admin Inspect output), and `src/components/dev-kit/AIKeySlotPanels.tsx` (`defaultModelForProvider` used as the fallback display label when an inspect response is missing the model field). The legacy `'deepseek-chat'` literal is *not* removed from `ai_routing_config` per-feature override rows because the alias still resolves until 2026/07/24 and a routing row that still says `deepseek-chat` will continue to work — admins can update those at their own pace via the routing panel. No `DEEPSEEK_MODELS` array exists in `providers.ts`, so `'deepseek-v4-pro'` is documented in the inline JSDoc comment as the alternative an admin may type into a per-feature `model` override on the routing panel; it is not added as a second selectable provider.
- **`thinking: { type: 'disabled' }` is now forced on every outbound DeepSeek request body.** Without this, an admin who overrides `model` on a routing row to `deepseek-v4-flash` (or any future DeepSeek model whose default flips to thinking-enabled) would silently start paying for thinking tokens and waiting through reasoning latency — the bill and the UX would both regress. The override is applied in three places that all reach DeepSeek:
  - `aiClient.ts` `callOnce` (pool path) — gated on `entry.provider === 'deepseek'`, applied immediately after the `response_format` branch and before headers are built so it covers JSON-mode and tool-calling requests too.
  - `aiClient.ts` `callBYOK` (user-provided-key path) — gated on `provider === 'deepseek'`, applied after `top_p` and before the fetch, so a BYOK DeepSeek user gets the same fast non-thinking behaviour as the pool.
  - `ai-test/index.ts` admin-pin branch — the test request body is hoisted to a `requestBody` variable so the conditional `requestBody.thinking = { type: 'disabled' }` can be applied for `provider === 'deepseek'` before `JSON.stringify`. The admin "Send test request" button now reproduces real production behaviour (fast reply in well under a second) rather than accidentally testing a slower thinking-mode path.

### Added
- **60-second default abort timeout for DeepSeek calls in `aiClient.callOnce`.** Per DeepSeek's own docs, a request can sit in the inference queue for up to ~10 minutes before the model starts producing tokens. Without a fetch-level signal, that stuck call would tie up the Edge Function until its platform wall-clock kills it (typically multiple minutes) — wasting Edge minutes and starving the user of a fallback. The new logic creates an `AbortController` with a 60 s `setTimeout` *only when* (a) the caller did not provide their own `opts.signal` AND (b) the chosen provider is `'deepseek'`. On abort, the catch block converts the `AbortError` into `AIError { code: 'upstream_timeout', status: 504, provider: 'deepseek:N' }` so the existing `callAIWithRetry` path treats it like any other transient upstream failure: attempt 2 retries on a sibling DeepSeek key, attempt 3 spills over to OpenRouter or Groq (or any other provider with a key in the pool). A `timedOut` boolean local distinguishes our timeout from a caller-supplied abort, and the `setTimeout` handle is cleared in a `finally` so a fast successful response doesn't leak the timer. This is intentionally **not** applied to OpenRouter or Groq — those providers don't have the queue-stall failure mode and the change stays scoped per the task plan.
- **HTTP 402 (`insufficient_balance`) is now a distinct typed error code on the AI client.** Previously the status-to-code switch in `callOnce` lumped 402 into `bad_request`, hiding "your DeepSeek account is out of credit" inside a generic 4xx bucket. The switch now emits `code: 'insufficient_balance'` for `res.status === 402`, applied uniformly to all three providers (in case OpenRouter or Groq ever start returning 402 for the same reason — they currently don't, but the code is provider-agnostic). The `ai-test` admin-pin branch additionally short-circuits 402 from DeepSeek with an admin-readable message — "DeepSeek account balance is depleted. Top up at platform.deepseek.com to restore service." — and a structured `reason: 'insufficient_balance'` field, so the admin DevKit panel can show a concrete next-step instead of dumping the raw upstream HTML/error blob.

### Behaviour preserved
- The `callAIWithRetry` retry-and-fallback strategy is unchanged — the new `upstream_timeout` errors flow through the same attempt-2/attempt-3 path as 5xx errors, so no callers need updating.
- Caller-supplied `opts.signal` still wins. The 60 s default only applies when no signal is provided; an external timeout (e.g. the edge function's own `AbortController`) overrides it.
- Forced-route honouring (`forced.provider !== 'auto'`) still skips the cross-provider fallback in attempt 3, so an admin who explicitly pins `tailor-resume` to `deepseek` won't have a `upstream_timeout` silently route to OpenRouter — they get the typed error instead.
- BYOK error surface is unchanged — DeepSeek BYOK timeouts (rare; the user's caller usually owns the abort) still throw `byok_failed` because the BYOK branch never inherits the 60 s default.
- Admin AI Routing panel options (`PROVIDER_OPTIONS` in `AIRoutingPanel.tsx`), the `ai_routing_config.provider` enum, and the `admin-ai-routing` validator are untouched — DeepSeek is already a first-class option.
- The user-facing BYOK provider dropdown is intentionally not touched (covered by Task #7).
- `public/changelog.json` v3.9.0 entry still says "DeepSeek uses the deepseek-chat model" — that entry is a historical record of what shipped at the time and is not rewritten. Future user-facing releases will mention the v4-flash alias when the deploy goes out.

### Verification
- `npx tsc --noEmit` clean across the whole repo.
- `rg deepseek-chat` against the five in-scope files returns only comment-string mentions (the explanatory deprecation notes), zero executable literals.
- Workflow restarted; both the React dev server (`vite`) and the Express API (`tsx --watch server/index.ts`) booted without errors. Browser console shows clean app initialization with Sentry active and no runtime exceptions.
- Steps 5 & 6 of the task plan are admin-only manual verifications (`Send test request` against live DeepSeek slots, route a real `tailor-resume` action, BYOK smoke test) that require live DeepSeek API keys in the production environment — they will run as part of the next post-deploy admin validation pass against `dev.thewise.cloud` and any failures will be filed as bug reports against this task.

**Files changed:** `supabase/functions/_shared/aiClient.ts`, `supabase/functions/_shared/providers.ts`, `supabase/functions/ai-test/index.ts`, `supabase/functions/inspect-ai-keys/index.ts`, `src/components/dev-kit/AIKeySlotPanels.tsx`, `project-governance/CHANGELOG.md`.

**Deployment:** four edge functions need a Supabase CLI deploy for the migration to fully take effect: `supabase functions deploy submit-contact-request ai-test inspect-ai-keys` plus a redeploy of every function that imports `_shared/aiClient.ts` and `_shared/providers.ts` (the entire AI surface — every function under `supabase/functions/` that calls `callAI`/`callAIWithRetry`/`pingProvider`). The standard "deploy all functions" CLI invocation handles this in one shot. The frontend change (`AIKeySlotPanels.tsx`) ships with the next Hostinger build. **No database migration, no env var change.** The legacy `deepseek-chat` alias keeps working on DeepSeek's side until 2026/07/24, so any function that hasn't been redeployed yet continues to serve traffic correctly during the rollout window.

---

## 2026-04-29 (Task #14 — Portfolio Fixes Phase 5: public page UX polish)

### Added
- **Honeypot spam trap on the public contact form** (`src/components/portfolio/public/PortfolioContactForm.tsx`, `supabase/functions/submit-contact-request/index.ts`). The client now renders a visually-hidden `website` input with `aria-hidden="true"`, `tabIndex={-1}`, off-screen positioning, and `autoComplete="off"` — sighted users and assistive tech never see or focus it. The submit handler still sends the field's value (almost always empty) in the JSON body. The edge function reads the new `website` field and, if it's a non-empty trimmed string, returns `200 + { success: true, id: null }` immediately — before any rate-limit decrement, DB insert, or notification. Bots get an indistinguishable-from-success response and won't retry with input variations; the rate-limiter window stays untouched so a single bot can't burn the IP's budget. Legitimate users see no UX change because the field is permanently empty and the early-return only triggers on truthy submissions.
- **GitHub-cache freshness badge with re-sync button — DRIFT, not implemented** (Step 6 of the task plan). Building this required (a) a `github_projects_cached_at` timestamp column on `profiles` and (b) a client-callable edge function that re-runs the GitHub fetch and writes the new cache. Neither exists today: the `github_projects_cache` JSONB column has no companion timestamp, and the only GitHub-related edge function (`admin-github-status`) is admin-only. The task plan's "Out of scope" section explicitly excludes "Writing a server-side cron to refresh GitHub caches", so adding either piece falls outside Phase 5's "small public-page improvements" scope. Deferred to a future phase that can plan the column add + edge function as a coordinated unit.
- **Inline pop-up-blocked panel under the Print / Save-as-PDF button** (`src/pages/PublicPortfolioPage.tsx`). When `window.open` returns `null` we now build a `Blob` URL from the same generated print HTML, store it in `printBlockedUrl` state, and render a persistent panel directly under the Print button containing: (1) a "Pop-ups are blocked" heading, (2) a short instruction telling the user to look for the address-bar pop-up icon and try again, (3) a clickable anchor (`target="_blank"`, `rel="noopener noreferrer"`) at the Blob URL labelled "Open print page in new tab", and (4) a follow-up line telling them to choose "Print → Save as PDF" in the new tab's print dialog. User-initiated anchor clicks are allowed by every modern browser even when pop-ups are blocked, so this is a guaranteed escape hatch. The previous transient toast is kept as a high-signal cue ("Pop-up blocked — see the panel below") that points at the new panel. The Blob URL is revoked on (a) successful subsequent open, (b) replacement by a new blocked attempt, and (c) component unmount via a cleanup effect, so we don't leak object URLs. The panel carries `data-pdf-exclude` so it won't appear inside the printed PDF if the user manages to open the print page via the link.
- **Live "X more skill(s) needed for full strength" hint in the strength card** (`src/pages/PortfolioEditorPage.tsx`). The skills entry inside `strengthChecks` now derives its `tip` text from a live `skillsCount` (read from `selectedResume.skills.length`). When `skillsCount < 3` the tip reads "1 more skill needed for full strength (2/3)" — pluralised for `skillsRemaining > 1` — so the user sees concrete progress in the strength tooltip the moment they edit, instead of having to publish/save and re-open the tooltip to see the updated state. When the threshold is met the tip falls back to the original "Add at least 3 skills to your resume" string for the (rare) case where the user later removes skills and the check flips back to red. The `SKILL_THRESHOLD = 3` constant captures the magic number for the tip text and the `ok` predicate together, so a future change to the threshold updates both in one place.

### Changed
- **`SectionWrapper` short-circuits to the no-`useScroll` path explicitly when `scrollEffect === 'fade'`** (`src/components/portfolio/public/PublicSections.tsx`). Behaviour was already correct (`ParallaxSection` and `Tilt3DSection` only mounted on `scrollEffect === 'parallax'` / `'tilt-3d'`), but the gate was implicit — a future contributor adding a third scroll-effect variant could easily start a per-card scroll subscription on the fade path. The wrapper now computes `useScrollEffect = !!scrollEffect && scrollEffect !== 'fade' && !prefersReducedMotion()` once and uses it as a precondition for both scroll-subscribing branches; the comment names the invariant ("never instantiate a per-card `useScroll` listener for the common case") for the next reader. The `prefersReducedMotion()` short-circuit is preserved verbatim so reduced-motion users still get the plain `motion.section` fade path even when the owner has selected parallax/tilt-3d.
- **Strength label decouples publish-state from content-completeness** (`src/pages/PortfolioEditorPage.tsx`). The previous cascade said "Publish to go live" any time `!portfolioEnabled && strengthScore >= 70`, even at score 100 — confusing users into thinking they still had unfinished checks. The new cascade gates entirely on `portfolioEnabled` first ("Live"), then on score: 100 → "Ready to publish", ≥ 70 → "Almost ready", ≥ 40 / ≥ 70 / 100 (draft) → "Needs work" / "Good" / "Strong" respectively. The text now answers exactly two orthogonal questions: "is the page actually serving traffic?" (handled by the publish-state branch) and "have you completed every recommended item?" (handled by the score branches).
- **`navigator.share` resolve / abort / failure paths each emit a distinct toast** (`src/pages/PortfolioEditorPage.tsx`, `handleShareQR`). Previously the `try/catch` swallowed every outcome silently with `/* cancelled */` — successful native share gave no feedback, and a real failure (no targets, permission denied) was indistinguishable from a deliberate cancellation. The new flow: success → `toast.success('Shared!')`; `DOMException.name === 'AbortError'` → neutral `toast('Share cancelled.')`; any other rejection → fall back to `navigator.clipboard.writeText` (with its own toast) and only surface `toast.error('Could not share or copy the link. Please try again.')` if the clipboard fallback also fails. The clipboard-only path (older browsers without `navigator.share`) is preserved verbatim.
- **Bio-generation precondition surface differentiates "no resume" from "empty resume"** (`src/pages/PortfolioEditorPage.tsx`, `handleGenerateBio`). The previous compound predicate (`!summary && !jobTitle && experience empty`) collapsed two materially different failure modes into a single "Selected resume has no data for bio generation." toast — users with no resume at all were told to fix a resume that didn't exist, and users with a real-but-blank resume weren't told what specifically was missing. The handler now branches: (a) `!currentResume` → "Create a resume first — bio generation needs work history or a job title to draw from."; (b) resume exists but every signal we'd feed the model (summary, profile.jobTitle, experience array) is blank → "Selected resume is empty — add a summary, job title, or work history before generating a bio." Both messages name a concrete next step.

### Behaviour preserved
- Honeypot field is sent only when populated by a bot; legitimate users send an empty string and hit the existing validation path verbatim. Rate limiter is intentionally NOT decremented on honeypot trip — we want the IP's budget to stay full so a single bot can't deny service to real users sharing its NAT.
- Edge-function rate limiter, payload-size cap, validation, and notification side-effects unchanged for legitimate submissions.
- All `scrollEffect` values continue to render their existing animations (parallax / tilt-3d / cinematic / fade); only the wrapper's gating is hardened.
- Strength tooltip layout, score colour thresholds, missing-tip truncation (`.slice(0, 3)`), and `StatusBar` props are unchanged — only the tip strings and label string reflect new content.
- The bio AI gate ("Resume data not available yet. Please wait a moment.") inside `callPortfolioAI` is still the canonical race-condition guard; the new pre-call branches only fire when the resume actually loaded but is empty.
- The print Blob URL is opened in a new tab via a normal `<a target="_blank">` so it stays sandboxed under the same browser-tab lifecycle a real `window.open` would have produced; the user's print dialog still picks up "Save as PDF" from their OS / browser as before.

**Files changed:** `src/components/portfolio/public/PortfolioContactForm.tsx`, `src/components/portfolio/public/PublicSections.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/pages/PublicPortfolioPage.tsx`, `supabase/functions/submit-contact-request/index.ts`, `project-governance/CHANGELOG.md`.

**Deployment:** mostly frontend-only (picked up by the Hostinger build on next deploy). One edge function (`submit-contact-request`) needs a separate Supabase CLI deploy (`supabase functions deploy submit-contact-request`) for the honeypot server-side trap to take effect — until that runs, the client sends the new `website` field but the server happily ignores it (extra unknown JSON keys are non-fatal), so the change is forward-compatible and safe to ship the frontend first.

**Drift:** Step 6 of the task plan (GitHub cache freshness badge + re-sync button) was deliberately not implemented — see "Added → GitHub-cache freshness badge" above for the dependency analysis. All seven other steps shipped as scoped.

---

## 2026-04-29 (Task #13 — Portfolio Fixes Phase 4: editor data integrity & preview)

### Fixed
- **`PortfolioSections` type now matches the keys the public renderer actually toggles** (`src/hooks/usePublicPortfolio.ts`, `src/components/portfolio/editor/ContentVisibilitySection.tsx`). The interface was missing `about`, `caseStudies`, `services`, and `testimonials` even though `PublicSections.tsx` reads `show('about')`, `show('caseStudies')`, `show('services')`, `show('testimonials')`. Both definitions of the type (the editor's source of `DEFAULT_SECTIONS` and the public hook's projection on `PublicProfile.portfolioSections`) now declare all 13 keys; `DEFAULT_SECTIONS` and `SECTION_LABELS` were extended in the same edit so the editor's visibility toggles now actually drive these four sections instead of silently inheriting "always show". The two `as unknown as Record<string, boolean>` casts in `PublicPortfolioPage.tsx:391` and `PublicSections.tsx:244` are gone — both call sites now pass `keyof PortfolioSections` to a typed `show()`, so adding or removing a section will surface as a TypeScript error rather than a silent runtime miss.
- **Custom-domain field rejects invalid hostnames and our own infrastructure both inline and on save** (`src/hooks/usePublicPortfolio.ts`, `src/components/portfolio/editor/MoreTab.tsx`, `src/pages/PortfolioEditorPage.tsx`). The previous flow accepted any string and persisted it straight into `portfolio_extras.customDomain`, where the routing layer would later try to resolve `replit.dev` / `*.replit.app` / `thewise.cloud` / `*.thewise.cloud` as a customer domain — producing routing loops or 404s that were hard to diagnose. A single `validateCustomDomain(value): string | null` helper now lives next to `isAppHostname` in `usePublicPortfolio.ts` so the inline field validator and the save-time guard share the exact same hostname regex (RFC-1035) and the same reserved set (`KNOWN_APP_SUFFIXES` plus the bare domains `thewise.cloud` / `replit.dev` / `replit.app`). `MoreTab` shows a red inline error under the input the moment the user types something invalid, marks the input `aria-invalid`, wires `aria-describedby` to the error message, and suppresses the misleading CNAME instruction block while invalid (because the instructions assume a valid domain). `handleSave` calls the same helper as the last line of defence and toasts the same message before issuing the request.
- **`portfolio_extras` write is now bounded at ~200 KB** (same file). The JSONB column is round-tripped on every profile read and every public portfolio fetch, so a runaway translations / case-studies blob silently degraded the per-user API even when the DB itself accepted it. `handleSave` now stringifies the composed extras object before sending it through `updateProfile` and rejects payloads above 200 KB with a toast that names the actual size and the cap, so the user knows which sections to trim. The cap was sized for dozens of services + multi-language translations.
- **All resume-dependent AI helpers now refuse to fire before resumes have loaded** (same file). The "Resume data not available yet" gate inside `callPortfolioAI` was guarded by `&& action === 'bio'`, so SEO / availability / critique / testimonial-prompt requests that landed during the initial `useResumes` race silently sent empty `experience`, `skills`, and `summary` to the edge function, producing low-quality output charged against the user's rate-limit budget. The action filter is removed; the gate now applies to every action that flows through `callPortfolioAI`. The four catch blocks (bio, SEO, availability, critique) were updated to surface the gate's own message via `err.message.startsWith('Resume data not available')` instead of swallowing it under the generic "Failed to generate …" toast — the gate would otherwise be invisible to the user. Translate is unaffected because `runTranslation` operates only on portfolio-side fields and doesn't go through `callPortfolioAI`.
- **Mobile preview empty-state now distinguishes "no username" from "not yet published"** (`src/pages/PortfolioEditorPage.tsx`). The phone-shell preview previously showed a single generic "Publish your portfolio to see a mobile preview" message for every reason the iframe couldn't render. The gate stays at `portfolioEnabled && portfolioCanonicalUrl` because the public route (`get_public_portfolio` RPC) filters `portfolio_enabled = true` and there is no draft-preview infrastructure to fall back on — pointing the iframe at the canonical URL while unpublished would just load a 404. The copy now branches: users with no username yet see "Set a username to see a mobile preview", users with a username but `portfolioEnabled = false` see "Publish your portfolio to preview on mobile". The desktop preview (`LivePreviewCard`) is a synthetic prop-driven preview that doesn't load the live URL at all — it remains the always-on iteration surface and is unchanged.
- **Portfolio history no longer accumulates byte-identical duplicate snapshots** (`src/hooks/usePortfolioHistory.ts`). `saveSnapshot` was unconditionally inserting a new `portfolio_history` row on every publish, so repeat saves with no real change polluted the restore picker with indistinguishable entries, pushed older meaningful snapshots off any retention window, and wasted JSONB storage. The mutation now reads the most recent snapshot for the user, compares serialized payloads, and short-circuits with `null` when they match — the unchanged on-success invalidation is harmless in that case (the cache stays valid). The return type of `saveSnapshot` is now `PortfolioHistoryRecord | null`; the editor's only caller (`saveSnapshot(updates).catch(() => {})`) ignores the return so no consumer change is needed.
- **`lastDraftPersistedSnapshotRef` is reset to the just-published snapshot after a successful publish** (`src/pages/PortfolioEditorPage.tsx`). The autosave dedup ref retained the pre-publish value, so a user edit that — by coincidence — produced the same serialized snapshot as the previous draft would be suppressed even though the `portfolio_draft` column had just been cleared by publish. The ref is now realigned with `lastSavedSnapshot` immediately after the successful write, so the very next divergence triggers a fresh draft autosave and the dedup invariant ("ref tracks what's currently in `portfolio_draft`") is restored.

### Behaviour preserved
- All existing `PortfolioSections` toggles (experience/education/skills/projects/certifications/awards/publications/volunteering/githubProjects) keep their previous default-on behaviour; the four new keys default to `true` so existing portfolios that have no `portfolioSections` record still render every section.
- The customDomain validator is gated on `isPaidUser` exactly like the existing `customDomain: isPaidUser ? … : null` write — free-tier users still cannot set the field at all.
- The 200 KB cap is enforced on both publish writes (the primary `updateProfile` and the auto-translation follow-up `updateProfile` that runs when `portfolioSecondaryLanguage` is set) so a fresh language entry can't push a near-full payload over the limit silently. `handleSaveDraft` is intentionally not capped because drafts are user-private and the round-trip cost concern only applies to the live `portfolio_extras` column (followed up in #20).
- AI gate continues to throw with the verbatim message "Resume data not available yet. Please wait a moment." — `handleGenerateTestimonialPrompt` (no catch) propagates it to its caller as before.
- Mobile preview iframe still uses `sandbox="allow-scripts allow-same-origin"` and the same 0.5641× scale → 220×396 phone shell.
- History dedup is byte-equality on `JSON.stringify` over the full payload (key-order-shuffles are treated as no-ops because the Supabase update path produces stable key order). Manual restore from history is unaffected because we don't delete or merge — we only skip duplicate inserts.

**Files changed:** `src/hooks/usePublicPortfolio.ts`, `src/components/portfolio/editor/ContentVisibilitySection.tsx`, `src/components/portfolio/editor/MoreTab.tsx`, `src/pages/PublicPortfolioPage.tsx`, `src/components/portfolio/public/PublicSections.tsx`, `src/pages/PortfolioEditorPage.tsx`, `src/hooks/usePortfolioHistory.ts`, `project-governance/CHANGELOG.md`.

**Deployment:** frontend-only change — picked up by the Hostinger build on the next deploy. No edge function, env var, or schema change.

---

## 2026-04-29 (Task #12 — Portfolio Fixes Phase 3: visitor analytics correctness)

### Fixed
- **Fast portfolio-to-portfolio navigation no longer attributes one visitor's view to the wrong owner** (`src/hooks/usePortfolioTracking.ts`). Previously the visibility/pagehide/unmount beacon was a `useCallback([])` that read `usernameRef.current` at FIRE time. When the hook instance was reused across a `/p/alice` → `/p/bob` route change, React ran the username-update effect (`usernameRef.current = 'bob'`) before the visibility handler fired, so any beacon for alice's session sent `username: 'bob'`. The visibility/pagehide effect now depends on `[username]` and pins the username into a `capturedUsername` closure at bind time; cleanup and onHide both call `sendBeaconCore(buildSnap())` with that pinned username. `refParam` and `abVariant` are deliberately read from their live refs at FIRE time (not pinned at bind) because `abVariant` is commonly resolved AFTER initial render — pinning at bind would attribute every late-resolving experiment session to `null`. The `useEffect` cleanup-then-body ordering guarantees the live refs still hold the OLD view's values during this effect's cleanup (cleanup runs in REVERSE declaration order, before the ref-update effect bodies re-run for the new view), so reading them in cleanup is race-free. A `lastUsernameRef` sentinel additionally resets `trackSentRef`, `mountTimeRef`, `sectionsViewedRef`, and `sectionTimingRef` on real portfolio change (NOT on refParam/abVariant tweaks), so each portfolio view gets its own beacon and never inherits the previous portfolio's section timing.
- **Sticky header reliably activates after the skeleton is replaced by the real hero** (same file). The previous sticky-header `IntersectionObserver` ran in a `useEffect(() => {...}, [])` that fired exactly once on mount, observed `heroRef.current === null` (because `<Suspense>` was still showing the skeleton), bailed, and never re-attached when `PublicHero` later mounted. The hook now exposes `heroRef` as a `useCallback` that calls `setHeroEl(node)`, and the observer effect depends on `[heroEl]` — so React re-runs the effect the instant the real hero element is attached or re-attached. `<PublicHero ref={heroRef} />` works unchanged because `forwardRef` accepts both RefObject and RefCallback shapes.

### Behaviour preserved
- Public hook return shape unchanged — `{ stickyVisible, heroRef, sendTrackingBeacon }`. The `sendTrackingBeacon` export still reads live ref values for any external caller (currently only test mocks; the real page consumes only `stickyVisible` and `heroRef`).
- Per-view "fire exactly once" semantic preserved — `trackSentRef` still gates duplicate beacons within a single portfolio view; only the per-portfolio reset is new.
- Section IntersectionObserver effect (already correct on `[username]`) untouched.
- `sendBeacon → fetch keepalive` fallback path (added in Task #11) preserved verbatim inside the new `sendBeaconCore`.

**Files changed:** `src/hooks/usePortfolioTracking.ts`, `project-governance/CHANGELOG.md`.

**Deployment:** frontend-only change — picked up by the Hostinger build on the next deploy. No edge function, env var, or schema change.

---

## 2026-04-29 (Task #11 — Portfolio Fixes Phase 2: edge function reliability)

### Security
- **Visitor IP geolocation moved to HTTPS** (`supabase/functions/track-portfolio-view/index.ts`). The previous implementation called `http://ip-api.com/json/{ip}` which transmitted the visitor's IP address in plaintext over the public internet on every portfolio view. Both call sites (the company-detection fallback and the country/city-only enrichment) now call `https://ipwho.is/{ip}` instead. Field shape mapping documented inline: `geo.status === "success"` → `geo.success === true`, `geo.org` → `geo.connection?.org`. The ASN-prefix-stripping regex is preserved as a defensive no-op for future provider swaps. No env var or API key required — ipwho.is is HTTPS-by-default on the free tier.

### Fixed
- **"I'm interested" no longer silently swallows legitimate second clicks within the hour** (`supabase/functions/portfolio-interest/index.ts`). Removed the per-IP-per-portfolio 1-per-hour `checkIpRateLimit` gate that ran BEFORE the database lookup, intercepting duplicate clicks before the DB had any chance to answer. Dedup is now exclusively the responsibility of the unique `token` constraint on `portfolio_interactions` — the request still hits the DB insert, the unique constraint fires `23505` if and only if the same client previously sent the same token, and the function returns `{ ok: true, alreadySent: true }` based on that exact signal. The cheap `5/min` and `20/day` per-IP burst guards are kept as abuse caps. Net result: the second click now reliably distinguishes "already recorded" from "first time success" via the response body.
- **Single rate-limit gate on AI bio/critique/SEO/availability/case-study/translate generation** (`supabase/functions/generate-portfolio-bio/index.ts`). Removed the duplicate `checkRateLimit` call against `ai_usage_logs` — the function was running the same `20-per-60s` gate twice, once against `ai_usage_logs` and once against `rpc_rate_limits`. The `checkUserRateLimit` call (which queries the authoritative `rpc_rate_limits` table — see `_shared/userRateLimiter.ts` module header) is the keeper. `recordUsage` still writes to `ai_usage_logs` after each successful generation for analytics; just no longer for enforcement.
- **Long visitor sessions no longer drop analytics** (`src/hooks/usePortfolioTracking.ts`). The `sendBeacon → fetch keepalive` fallback previously fired only when `navigator.sendBeacon` was undefined entirely, but in modern browsers `sendBeacon` returns `false` (without throwing) when the queued payload exceeds the per-origin queue cap (~64 KB). The hook now captures that boolean return and falls through to the `fetch(..., { keepalive: true })` path on `false` exactly the same as on a missing API. Sessions with many sections viewed (heavy `sectionsTiming` payload) now record reliably.

**Files changed:** `supabase/functions/portfolio-interest/index.ts`, `supabase/functions/track-portfolio-view/index.ts`, `supabase/functions/generate-portfolio-bio/index.ts`, `src/hooks/usePortfolioTracking.ts`, `project-governance/CHANGELOG.md`.

**Deployment:** edge function changes deploy via the usual function-deploy GitHub Actions path on push to `main`. No database migration, no env var changes.

---

## 2026-04-29 (Task #10 — Portfolio Fixes Phase 1: server-side bcrypt + 8-char minimum)

### Security
- **Eliminated client-side SHA-256 hashing of portfolio passwords.** The editor previously hashed the user's password with unsalted SHA-256 before sending it to the server, which leaked identical hashes for identical passwords across users and defeated bcrypt's salt entropy beneath the wrapper. Hashing now happens fully server-side. (`src/pages/PortfolioEditorPage.tsx` — `sha256hex()` helper deleted; new save flow described below.)
- **New `set_portfolio_password(p_password text, p_enabled boolean)` RPC** (`supabase/migrations/20260516000000_portfolio_password_raw.sql`). SECURITY DEFINER, granted to `authenticated`, becomes the sole writer of `portfolio_extras.passwordHash` / `portfolio_extras.passwordEnabled`. Bcrypts raw passwords directly (no SHA-256 wrapping), enforces an 8-character minimum (`SQLSTATE 22023`), and merges with the `||` JSONB operator so unrelated extras keys are preserved. Disable path clears the hash; enable-without-new-password keeps the existing hash but flips the flag (rejects when no hash is set).
- **`get_public_portfolio` verify path extended** (same migration). Now attempts `bcrypt(raw)` first (Phase 1 format) before falling back to `bcrypt(sha256(raw))` (Phase 0 backfilled format), then to direct SHA-256 comparison (pre-Phase-0 legacy). All other body lines (rate limiting, sanitisation, return shape) preserved byte-for-byte from migration `20260426000000`. Existing protected portfolios continue unlocking with their original passwords.

### Changed
- **Editor save flow** (`src/pages/PortfolioEditorPage.tsx`): pre-flight validation rejects enabling protection without an existing hash + no new password, and rejects new passwords shorter than 8 chars. Inside the try block, an authoritative `SELECT portfolio_extras` runs against the DB before composing the payload — this defeats stale React Query caches that would otherwise overwrite a real `passwordHash` with `null`. Immediately after `updateProfile`, when `pwdStateChanged` is true (toggle flipped or new password entered), the editor calls `set_portfolio_password({ p_password, p_enabled })` and updates a sentinel `passwordHash` state (`'set'` / `''`) so the "password is set" UI hint stays correct without leaking the actual hash. Known residual: a one-round-trip-wide concurrent-tab race remains; documented inline as a Phase 2 follow-up.
- **Public unlock gate** (`src/pages/PublicPortfolioPage.tsx`): `PasswordGate` no longer enforces a min length on submit, no longer trims, and no longer carries the `tooShort` helper. Submit is enabled whenever `value.length > 0 && !isChecking`. This (a) keeps legacy short-password portfolios unlockable and (b) preserves whitespace-edge passwords for exact-match comparison server-side.
- **Editor password card UI** (`src/components/portfolio/editor/MoreTab.tsx`): password input gains `aria-invalid` when `< 8` chars; inline destructive helper appears below the input when too short; baseline helper text now reads "Minimum 8 characters. Save your portfolio to activate the password gate."

**Files changed:** `supabase/migrations/20260516000000_portfolio_password_raw.sql` (new), `src/pages/PortfolioEditorPage.tsx`, `src/pages/PublicPortfolioPage.tsx`, `src/components/portfolio/editor/MoreTab.tsx`, `Project Atlas/01-Currently Implemented/critical-systems/11-portfolio-password-security.md`, `project-governance/CHANGELOG.md`.

**Deployment:** the migration applies automatically when the GitHub Actions `db-migration.yml` workflow runs on the next push to `main` (uses `supabase db push --linked` against the configured project).

---

## 2026-04-26 (Task #11 — Dev Kit: admin username bypass + user identity fixes)

### Added
- **Admin portfolio username bypass** (`supabase/functions/admin-update-profile/index.ts`): new `admin_bypass_validation: boolean` request field. When `true`, the `check_username_available` RPC is skipped entirely; only a direct `profiles` uniqueness check is run so the admin can assign any slug (1 char, symbols, etc.) without hitting user-facing length/character rules. Still rejects if another active user owns the exact slug.
- **In-app notification on username change** (`supabase/functions/admin-update-profile/index.ts`): inserts a `notifications` row (`type: 'admin_action'`) for the affected user after every successful admin-initiated username change, so the user is informed of the new slug.
- **Enriched identity endpoint** (`supabase/functions/admin-get-identity/index.ts`): now returns `signed_up_at` and `last_sign_in_at` from `auth.users`, and conditionally returns `kinde_email` via Kinde Management API when M2M credentials (`KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, `KINDE_M2M_CLIENT_SECRET`) are present and the auth email is a placeholder.
- **Identity card improvements** (`src/components/dev-kit/UserDetailDrawer.tsx`): shows Kinde email (when available, at top), Contact email, Auth email (internal, with placeholder label), Joined date, Last sign-in date, Kinde sub, Last token exchange.

### Changed
- **AI error parser bleed-through fixed** (`src/integrations/supabase/edgeFunctions.ts`): for any `admin-*` function that returns a non-ok response, the wrapper now reads the raw `error` / `message` field from the JSON body instead of routing through `parseAIErrorBody`. This prevents validation error bodies (e.g. `{ status: "invalid" }`) from being misread as AI failure codes and showing "AI is temporarily unavailable."
- **Admin username field — uniqueness-only check** (`src/components/dev-kit/UserDetailDrawer.tsx`): the debounced availability indicator now uses a direct `profiles` SELECT (not `check_username_available` RPC), shows ✓/✗ based on uniqueness only. The Save button is no longer disabled by the ✗ indicator — admin can override.
- **Old-URL warning updated** (`src/components/dev-kit/UserDetailDrawer.tsx`): notice now reads "The user has been sent an in-app notification about this change."
- **User list email display** (`src/components/dev-kit/AdminUsersPanel.tsx`): `contact_email` is now preferred over auth email for all users (not just collision/shadow accounts); `isKindeShadow` check updated to match the broader `@kinde.placeholder` suffix.
- **Admin update-profile** (`supabase/functions/admin-update-profile/index.ts`): removed the `status: availStatus` field from validation error response bodies (was colliding with AI error parser's `status` field).

---

## 2026-04-26 (Stability — Phase 12 editor audit + CI verification fix + v3.6.3 release)

### STABILITY — Phase 12: Editor audit Phase 2 (Tasks #1, #4–#8)

Four categories of editor issues addressed:

- **`src/context/KeyboardContext.tsx`** — Single combined context split into `KeyboardStateContext` (state + `_hasProvider` sentinel) and `KeyboardDispatchContext` (setter only). Components that only update keyboard state no longer subscribe to state changes, eliminating spurious re-renders. The `_hasProvider: false` default allows consumers outside the provider to detect the missing-provider case rather than silently using stale defaults.

- **`src/pages/EditorPage.tsx`** — `MobileLayout` wrapper component removed. The component had become a no-op shell after earlier refactors; it added a DOM node and reconciliation boundary while applying no layout logic, causing occasional flicker and double-scroll on small screens.

- **`src/components/editor/AwardsSection.tsx`**, **`src/components/editor/ProjectsSection.tsx`** — All `<Label>` elements now carry `htmlFor` attributes paired to the matching `<Input>` / `<Textarea>` `id`. Instance-scoped IDs (`award-${id}-title`, `proj-${id}-name`, etc.) ensure uniqueness. Screen readers and browser auto-fill now work correctly across both sections.

- **`src/lib/editorLogger.ts`** (new) — Thin DEV-only wrapper around `console.warn` / `console.error`. Guarded by `import.meta.env.DEV`; tree-shaken from production builds by Vite. All internal editor debug calls now route through this module.

### STABILITY — CI: deploy verification window extended

- **`.github/workflows/deploy.yml`** — "Verify live site reflects the new build" step extended from 6 attempts × 10 s (60 s) to 18 attempts × 20 s (6 min). Empirical observation on runs 24959568755 and 24959697031: Hostinger's origin server took ~3 min after the lftp mirror to serve newly-uploaded static files, causing false-fail on otherwise-successful deploys. Reason documented inline in the workflow.

### RELEASE — v3.6.3 shipped to resume.thewise.cloud

- **`public/changelog.json`** — v3.6.3 entry prepended (`latest: true`); v3.6.1 entry flipped to `latest: false`. Covers the four Phase 12 items above (keyboard context, mobile layout, label fixes, DEV logger). GitHub Actions run 24959807509: `completed / success`. All 7 live-site checks pass (`node scripts/verify-live-deploy.mjs`).
- **`package.json`** — version `3.6.3`.

**Files changed:** `src/context/KeyboardContext.tsx`, `src/pages/EditorPage.tsx`, `src/components/editor/AwardsSection.tsx`, `src/components/editor/ProjectsSection.tsx`, `src/lib/editorLogger.ts` (new), `.github/workflows/deploy.yml`, `public/changelog.json`, `Project Atlas/01-Currently Implemented/stability-fixes/phase-12-editor-audit-phase-2.md` (new), `Project Atlas/01-Currently Implemented/stability-fixes/README.md`, `Project Atlas/01-Currently Implemented/critical-systems/08-deployment.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-23 (Stability — Task #30: PDF export migration to Puppeteer for the dashboard list row)

### STABILITY — Last legacy `html2canvas` PDF caller migrated to the native Puppeteer pipeline

Finishes the multi-task migration that moved every resume PDF download in the product onto `src/lib/nativePdfGenerator.ts` (Puppeteer-backed, text-selectable). Four of the five callers had already been migrated in earlier tasks; the dashboard's Applications view (`src/components/applications/ResumeListSheet.tsx`) was the last holdout still calling the legacy `generatePDF` from `src/lib/pdfGenerator.ts` and producing image-based (rasterised) PDFs.

- New `src/lib/exportResumePdf.ts` — `exportResumePdfFromData(resume, templateId, options)` mounts a lazy resume template into an offscreen container (`left:-10000px`, `width:816px`, `data-resume-template=""`) via `createRoot` + `<Suspense>`, injects the user's `generateCustomizationCSS` inline, awaits `document.fonts.ready`, RAF-polls until `scrollHeight > 100`, calls `generateNativePDF`, and unmounts in `finally`. Throws a typed `OffscreenRenderTimeoutError` if the lazy chunk never paints inside `renderTimeoutMs` (default 4 s, configurable) so the caller surfaces a clear export-failed toast instead of a blank PDF. The `renderTimeoutMs` option is stripped before forwarding to the native pipeline.
- `src/components/applications/ResumeListSheet.tsx` — `handleDownload` switched from `generatePDF` to `exportResumePdfFromData(resume, templateId, { showPageNumbers: true, showBranding: true })` with a `console.error` on failure for diagnosability.
- `src/lib/pdfGenerator.ts` — removed the four deprecated public exports: `generatePDF`, `generateOnePagePDF`, `generateCoverLetterPDF`, `generateCombinedPDF`. Kept the measurement utilities still consumed by the rest of the app (`PAGE_FORMAT_PX`, `FOOTER_RESERVED_PT`, `prepareForMeasure`, `calculatePDFDimensions`, `estimatePageCount`, `estimateOnePageScale`, `snapBreaksToContent`, `injectForcedBreaks`, `findWhitespaceBandSnap`, `getTemplateSourceElement`, `wrapText`, `PdfGenerationError`).
- `src/lib/pdfGenerator.test.ts` — removed test blocks that exercised the deleted public exports (the `generatePDF` describe, the TPL-2 truncation guard, the TPL-2 raster-area ceiling test). 9 measurement-helper tests retained, all passing.
- New `src/lib/exportResumePdf.test.ts` — covers the timeout-throw + cleanup contract: when the offscreen template never paints inside a small `renderTimeoutMs`, the function throws `OffscreenRenderTimeoutError`, never invokes `generateNativePDF`, and leaves no `[data-resume-template]` containers behind.

**Drift / known gap:** ~300 lines of internal helpers in `pdfGenerator.ts` that only existed to support the removed public exports (`generatePDFPages`, `captureTemplateAsCanvas`, `prepareForCapture`, `getPageDimensions`, `addPageFooter`, `extractAndEmbedLinkAnnotations`) are now dead code but were intentionally left in place to limit blast radius. Tracked as follow-up Task #49.

**Verification:** `tsc --noEmit` clean; full `src/lib` vitest suite passes (224 tests); architect code review APPROVED with the `OffscreenRenderTimeoutError` + test added in response to non-blocking review comments.

**Atlas docs:** `Project Atlas/01-Currently Implemented/stability-fixes/phase-11-pdf-export-puppeteer-migration.md`; plain-language entry prepended to `Project Atlas/04-For You (Plain Language)/stability-improvements.md` ("Every PDF download is now text-selectable…").

---

## 2026-04-23 (Stability / Honesty — Task #12: Editor ATS panel relabelled as "Job Match Analysis" / "Keyword Match Score")

### STABILITY — Editor copy now honestly describes what the score measures (keyword overlap with the pasted JD, not external-ATS prediction)

The editor's "ATS Score" had been labelled and copywritten as if it predicted external applicant-tracking system behaviour. It does not — it measures only keyword and content overlap against the user's pasted job description. The misleading label produced two real risks: false confidence ("87 means I'll pass any ATS") and false panic ("42 means my template is broken"). Across every editor surface that exposes the score, the copy now consistently reflects what the metric actually measures. Score, algorithm, and panel layout are all unchanged.

- `src/pages/EditorPage.tsx` — Tools-sheet entry "ATS Check / Score against ATS systems" → "Job Match Analysis / Keyword & content match vs your job description". Mobile inline ATS Scan summary footnote added to match the bottom-sheet wording.
- `src/components/editor/JobAnalysisSheet.tsx` — overall score header relabelled "Keyword Match Score" with explanatory footnote; breakdown ScoreCard "ATS Score" → "ATS Keywords".
- `src/components/editor/ATSScanSheet.tsx` — same explanatory footnote added under the keyword-match score.
- `src/components/editor/ATSInlineSuggestions.tsx` — caption added clarifying suggestions reflect keyword overlap, not layout or external-tool scores.
- `src/components/editor/TailorSheet.tsx` — toast and error copy "ATS score" → "Keyword match score".
- `src/components/editor/tailor/TailorProgress.tsx` — step label "Calculating ATS score" → "Calculating keyword match score".
- `src/components/editor/ai/AIEnhanceSheet.tsx` — sheet title "ATS Score Optimization" → "ATS Keyword Optimization".

**Out of scope (proposed as follow-ups #47 and #48):** Dashboard / Analytics ATS Score widgets and the Multi-Job Compare / AI Studio A/B compare sheets. Same relabelling discipline to be applied there in a later pass.

**Verification:** `tsc --noEmit` clean. No tests reference the changed strings.

**Atlas docs:** `Project Atlas/01-Currently Implemented/stability-fixes/ats-keyword-match-clarity.md`; plain-language entry prepended to `Project Atlas/04-For You (Plain Language)/stability-improvements.md` ("The editor's 'ATS Score' panel now honestly says it measures keyword match…").

---

## 2026-04-18 (Security — Task #8: Portfolio Password Server-Side Enforcement + Local-Only Mode Removal)

### SECURITY — Portfolio password enforcement moved server-side; Local-Only Mode toggle removed

Two user-trust issues addressed:

1. **"Local-Only Mode" removed.** The toggle in Settings → Privacy claimed data would remain on-device when enabled. The flag (`localOnlyMode`) had no consumers outside the UI — Supabase writes continued regardless. The toggle has been removed entirely to prevent the misleading label from persisting.
   - `src/store/settingsStore.ts` — `localOnlyMode` state, getter, setter, and `privacyStatus` reference removed.
   - `src/components/settings/sections/PrivacySection.tsx` — toggle and supporting copy removed.

2. **Portfolio password enforcement moved to the server.**
   - New SQL migration `supabase/migrations/20260426000000_portfolio_password_server_side.sql`: adds `get_portfolio_gate_info(p_username)` RPC (gate metadata only, no hash) and overwrites `get_public_portfolio` with a `p_password` overload that calls `extensions.digest()` server-side for SHA-256 comparison.
   - `src/hooks/usePublicPortfolio.ts` — `usePortfolioGate` uses new RPC; hash never returned to browser; graceful fallback to REST (no hash) if RPC missing; `usePublicPortfolio` forwards raw password to server.
   - `src/pages/PublicPortfolioPage.tsx` — client-side `sha256hex()` removed; `PasswordGate` switched to `onSubmit` (raw password over HTTPS).

**Migration status:** Applied successfully 2026-04-18. Verified: `get_portfolio_gate_info` deployed, `get_public_portfolio(text, text)` deployed, old bypassable single-arg signature dropped. Existing password hashes backfilled to bcrypt. `SUPABASE_ACCESS_TOKEN` now set in Replit env vars and GitHub Actions secrets.

- **Engineering card:** `Project Atlas/01-Currently Implemented/critical-systems/11-portfolio-password-security.md` (new).
- **Plain-language summary:** "Security Fix — Portfolio passwords are now enforced on the server" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief:** `.local/tasks/security-trust-fixes.md`.

---

## 2026-04-18 (Governance — Documentation Discipline rule + Phases 1–5 backfill)

### GOV — Documentation Discipline rule (three-surface mandate)

The constitution now mandates that **every** accepted change be documented in three surfaces before a task can be marked done: (1) `Project Atlas/01-Currently Implemented/`, (2) `Project Atlas/04-For You (Plain Language)/`, (3) `project-governance/CHANGELOG.md`. The in-app "What's New" page (`src/pages/WhatsNewPage.tsx`) is **explicitly out of scope** for this rule — that page is the product's release-notes UI for end users, not an engineering-change documentation surface.

- **`project-governance/CONSTITUTION.md`** — added §6.6 ("Documentation Discipline") with the three-surface mandate, the WhatsNew exclusion, and a per-change-type mapping table (frontend page / edge function / migration / shared infra / build / background job / AI resilience / analytics / governance / dependency). Updated §6.5 ("Task Completion Definition") so a task is not "done" until all three surfaces have been updated and the agent's final summary explicitly lists which Atlas files were touched.
- **`Project Atlas/MAINTENANCE.md`** — added a "Three-surface documentation rule" section that mirrors §6.6 and points back to the constitution as the source of truth. Extended the "If you change… / Re-verify…" mapping table with rows for build/bundle changes, server-side scheduled jobs, AI provider resilience, component-level background-work hygiene, analytics/data-lifecycle, and governance changes themselves. Added an explicit reminder that the plain-language doc must be touched whenever a user-visible behavior changes. Bumped `Last verified:` to 2026-04-18.

### STABILITY — Phase 1 documentation backfill (database integrity & indexes)

Phase 1 of the 2026-Q2 stability initiative — adding `ON DELETE CASCADE` foreign keys to every relational column in the Drizzle schema and adding the 18 missing FK-style B-tree indexes — is documented after the fact to bring Atlas in line with the new three-surface rule. No code changes in this entry; documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-1-db-integrity-and-indexes.md` (new).
- **Plain-language summary**: "Phase 1 — A more careful database" section in `Project Atlas/04-For You (Plain Language)/stability-improvements.md` (new doc).
- **Source brief**: `.local/tasks/phase-1-db-integrity.md`. **Files touched by the underlying work**: `server/schema.ts`, `server/db.ts`, `drizzle.config.ts`, `server/index.ts`.

### STABILITY — Phase 2 documentation backfill (frontend re-render & bundle fixes)

Phase 2 — `React.memo` on resume template sub-components, 80–120ms debounce on `LivePreviewPanel`, removal of `framer-motion` from layout-shell primitives, `lazyWithRetry` on `AuroraBackground`, and `@tanstack/react-virtual` on the dashboard resume list past ~30 rows — is documented for Atlas. No code in this entry; documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-2-frontend-rerender-and-bundle.md` (new).
- **Plain-language summary**: "Phase 2 — A snappier resume editor and a faster homepage" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-2-frontend-rerender.md`. **Files touched by the underlying work**: `vite.config.ts`, `src/AppInterior.tsx`, `src/components/templates/`, `src/components/editor/LivePreviewPanel.tsx`, `src/lib/lazyWithRetry.ts`, `src/pages/DashboardPage.tsx`.

### STABILITY — Phase 3 documentation backfill (background work hygiene)

Phase 3 — `visibilitychange`-driven pause of `AIHealthBadge` polling, OCR moved to a Web Worker, `pdfjs-dist` worker enabled with per-page yield, 250–400ms debounce on `useResumeScore`, and a sweep of all component-level `setInterval` / `setTimeout` cleanups — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-3-background-work-hygiene.md` (new).
- **Plain-language summary**: "Phase 3 — The platform stops working when you're not looking" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-3-background-hygiene.md`. **Files touched by the underlying work**: `src/components/ai/AIHealthBadge.tsx`, `src/hooks/useActiveStatus.ts`, `src/lib/pdfParser.ts`, `src/hooks/useResumeScore.ts`.

### STABILITY — Phase 4 documentation backfill (AI provider resilience)

Phase 4 — new `ai_provider_breaker` table + upsert RPC, circuit-breaker logic in `_shared/aiClient.ts` (5 failures in 60s opens for 60s, then a single probe), explicit `usage_date` pass-through to `atomic_refund_credit` in `_shared/creditUtils.ts` to fix the off-by-day refund bug, structured BYOK error classification (`invalid_key` / `quota_exceeded` / `upstream_5xx`) surfaced via `useAIAction` / `useAIEnhance`, and a new admin-gated `/api/fn/ai-breaker-status` endpoint — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-4-ai-provider-resilience.md` (new).
- **Plain-language summary**: "Phase 4 — When an AI provider has a bad day, we don't make you wait for it" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-4-ai-resilience.md`. **Files touched by the underlying work**: `supabase/functions/_shared/aiClient.ts`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/_shared/dbClient.ts`, `supabase/functions/ai-health/index.ts`, `server/schema.ts`, `src/hooks/useAIAction.ts`, `src/hooks/useAIEnhance.ts`.

### STABILITY — Phase 5 documentation backfill (analytics data lifecycle)

Phase 5 — BRIN indexes on `created_at` for `portfolio_visits`, `error_log`, `audit_logs`; a once-per-day Express-process retention sweep deleting in 10k batches; env-tunable retention windows (defaults: 90 / 30 / 365 days); per-table deleted-row-count logging; an admin status endpoint; and the policy section in `replit.md` — is documented for Atlas. Documentation only.

- **Engineering card**: `Project Atlas/01-Currently Implemented/stability-fixes/phase-5-analytics-data-lifecycle.md` (new).
- **Plain-language summary**: "Phase 5 — Old analytics data is now cleaned up automatically" in `Project Atlas/04-For You (Plain Language)/stability-improvements.md`.
- **Source brief**: `.local/tasks/phase-5-data-lifecycle.md`. **Files touched by the underlying work**: `server/schema.ts`, `server/index.ts`, `replit.md`.

**Files changed in this changelog entry**: `project-governance/CONSTITUTION.md`, `project-governance/CHANGELOG.md`, `Project Atlas/MAINTENANCE.md`, `Project Atlas/01-Currently Implemented/README.md`, `Project Atlas/01-Currently Implemented/stability-fixes/` (new subfolder, 1 README + 5 cards), `Project Atlas/04-For You (Plain Language)/README.md`, `Project Atlas/04-For You (Plain Language)/current-features.md`, `Project Atlas/04-For You (Plain Language)/stability-improvements.md` (new).

---

## 2026-04-23 (Governance — AUDIT-2026-04 Backfill)

### GOV — Project governance refresh against live codebase

A targeted audit (`project-governance/AUDIT-2026-04.md`) reconciled the governance docs against the live `supabase/functions/`, `supabase/migrations/`, and `src/integrations/supabase/` state. Only facts already present in the codebase were added to governance — no new behavior was introduced. Surgical edits only; section ordering and tone preserved.

- **PRODUCT.md** — WiseHire status updated from "Phase 1 in spec, not yet built" to: Phase 1 fully shipped end-to-end; Phase 2 and Phase 3 partially shipped (edge functions and frontend pages exist, but several backing tables have no migration file). Public job board explicitly marked **NOT shipped** — the routes do not exist in `src/AppInterior.tsx`.
- **ARCHITECTURE.md §3** — Stack table edge function count corrected from 87 → 93.
- **ARCHITECTURE.md §5** — Promoted `discount_codes`, `coupon_redemptions`, `admin_audit_log`, `admin_user_notes`, `app_settings` from "Additional Tables (verify)" into a new "Coupons, Admin & Platform" section under "Current Tables." Added missing tables: `tool_cache`, `company_briefings`, `portfolio_history`, `portfolio_interactions`, `portfolio_username_rules`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_user_overrides`, `interview_answers`, `interview_report_tokens`, `resume_snapshots`, `tailoring_results`, `error_log`. Added a `seo_noindex` note on `portfolio_settings`. Marked `signup_otps` deprecated. Added an explicit type-generation status note.
- **ARCHITECTURE.md §7** — Function count corrected from 92 → 93. Added missing live functions: `admin-onboarding-funnel`, `admin-portfolio-usernames`, `portfolio-interest`. Removed `fetch-github-projects` from the Portfolio table (function directory no longer exists; see audit item A1).
- **ARCHITECTURE.md §2 — Rule C** — Marked **suspended pending owner sign-off** because `fetch-github-projects` is missing from `supabase/functions/`. Cross-references `AUDIT-2026-04.md` item A1.
- **ARCHITECTURE.md §9** — WiseHire function count corrected from 13 → 14 (added missing `wisehire-validate-early-access`). Removed bogus public job-board routes `/jobs`, `/jobs/:companySlug`, `/jobs/:companySlug/:roleSlug`, `/my-applications` (not registered in `src/AppInterior.tsx`). Tagged the 9 WiseHire Phase 2/3 tables that have **no migration file** with a clear warning (see audit item A5).
- **DECISIONS.md** — Added ADR #9 (single source of truth for plan credit limits via `creditLimits.json`) and ADR #10 (atomic credit deduction RPC, migration `20260416000001`). A proposed ADR #11 (WiseHire public job board) was retracted after verification — see audit item A5.
- **CONSTITUTION.md §5** — Decision count updated from 8 → 10 to match the actual ADR count after the additions/retraction above.
- **AUDIT-2026-04.md** — New audit report listing every drift found, the source file proving it, and the fix applied.

**Files changed**: `project-governance/PRODUCT.md`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CONSTITUTION.md`, `project-governance/CHANGELOG.md`, `project-governance/AUDIT-2026-04.md` (new).

---

## 2026-04-22 (WiseHire — Pipeline Bulk Ops + Atomic Credit Refund)

### FEAT — WiseHire pipeline bulk operations & master CV RPCs

- **DB** (`supabase/migrations/20260422000001_pipeline_bulk_and_master_cv_rpcs.sql`): Added RPCs supporting bulk pipeline-stage moves on `wisehire_candidates` and master-CV reuse across briefs.
- **DB** (`supabase/migrations/20260422000002_atomic_refund_credit_and_reset_premium_usage.sql`): Added `atomic_refund_credit` RPC for safe rollback of credits when an AI call fails after deduction, plus `reset_premium_usage` for premium-tier daily reset bookkeeping.
- **DB** (`supabase/migrations/20260422000003_portfolio_username_admin.sql`): Created `portfolio_username_rules`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_user_overrides`. Backed by new `admin-portfolio-usernames` edge function.

**Files changed**: `supabase/migrations/20260422000001_*.sql`, `supabase/migrations/20260422000002_*.sql`, `supabase/migrations/20260422000003_*.sql`, `supabase/functions/admin-portfolio-usernames/`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-21 (Portfolio — Analytics Enhancements)

### FEAT — Portfolio interactions table + premium analytics RPCs

- **DB** (`supabase/migrations/20260421000001_portfolio_interactions.sql`): New `portfolio_interactions` table records granular events (clicks, scroll depth, downloads) on public portfolios. RLS: owner read.
- **DB** (`supabase/migrations/20260421000002_portfolio_analytics_enhancements.sql`): RPCs for premium analytics aggregations (top sources, daily trend, engagement breakdown).
- **DB** (`supabase/migrations/20260423000000_analytics_premium_rpcs.sql`): Additional premium-tier analytics RPCs feeding the dev kit + premium portfolio dashboard.

**Files changed**: `supabase/migrations/20260421000001_*.sql`, `supabase/migrations/20260421000002_*.sql`, `supabase/migrations/20260423000000_*.sql`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-20 (WiseHire — Phase 1 MVP Shipped)

### FEAT — WiseHire MVP launch (Phase 1)

WiseHire shipped its full Phase 1 MVP under invite-only Early Access. All routes are gated by `WiseHireGuard` enforcing `account_type = 'hr'`.

- **DB** (`supabase/migrations/20260420000001_wisehire_account_type.sql`): Added `profiles.account_type` (`job_seeker` | `hr`, NOT NULL, DEFAULT `job_seeker`).
- **DB** (`20260420000002` … `20260420000008`): Created `wisehire_waitlist`, `wisehire_invites`, `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events`. All with RLS scoped to the owning HR user.
- **DB** (`20260420000020_wisehire_redeem_early_access_rpc.sql`, `20260420000021_wisehire_waitlist_drop_size_check.sql`, `20260420000022_error_log.sql`, `20260420000023_audit_logs_nullable_user_id.sql`): Supporting RPCs and a new `error_log` table for server-side error capture.
- **Edge functions**: `wisehire-waitlist-join`, `wisehire-validate-invite`, `wisehire-validate-early-access`, `wisehire-complete-signup`, `wisehire-write-jd`, `wisehire-generate-brief`, `admin-wisehire-invite`, `admin-wisehire-waitlist`. AI endpoints enforce the four-layer security invariant (Rule A) and **fail-closed** rate limiting per WiseHire policy.
- **Phase 2 follow-on** (edge functions and frontend pages only — backing tables NOT yet migrated, will fail at runtime): `wisehire-bulk-screen`, `wisehire-mask-cvs`, `wisehire-send-outreach`, `ScorecardPage`, `ScorecardTemplatesPage`, `PublicScorecardPage`. Public share routes `/share/brief/:shareToken` and `/share/scorecard/:shareToken` are live. Tables `wisehire_bulk_screen_jobs`, `wisehire_scorecards`, `wisehire_scorecard_templates`, `wisehire_candidate_notes`, `wisehire_outreach_emails` have **no migration file**.
- **Phase 3 follow-on** (edge functions and frontend pages only — backing tables NOT yet migrated): `wisehire-talent-search`, `wisehire-talent-view`, `wisehire-apply`, `TalentPoolPage`, `WiseHireAnalyticsPage`. Tables `talent_pool_profiles`, `talent_pool_views`, `wisehire_applications` have **no migration file**. The first-party public job board (`/jobs/*`) was **NOT shipped** — those routes are not registered in `src/AppInterior.tsx`. Portfolio view notifications still planned.

**Files changed**: 14 new edge function directories under `supabase/functions/wisehire-*` and `supabase/functions/admin-wisehire-*`; new migrations under `supabase/migrations/2026042*` (Phase 1 schema + supporting RPCs only — Phase 2/3 table migrations still pending); new routes under `src/pages/wisehire/`; `project-governance/PRODUCT.md`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-19 (Resumes — Phase 2 Features + Persisted Briefings)

### FEAT — Resume snapshots, interview report tokens, persisted company briefings

- **DB** (`supabase/migrations/20260419000000_phase2_features.sql`): Added `resume_snapshots`, `interview_answers`, `interview_report_tokens`. Snapshots back the rollback path after a `tailor-resume` run; report tokens enable signed read-only interview report links.
- **DB** (`supabase/migrations/20260419000000_add_company_briefings.sql`): Added `company_briefings` table. Backs the cache-reuse UI in `AgenticChatSheet` (Wise AI Phase 3) alongside `tool_cache`.
- **DB** (`supabase/migrations/20260419000001_phase2_security_fix.sql`): Tightened RLS on the new tables to owner-only access.

**Files changed**: `supabase/migrations/20260419000000_phase2_features.sql`, `supabase/migrations/20260419000000_add_company_briefings.sql`, `supabase/migrations/20260419000001_phase2_security_fix.sql`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-18 (Tailoring — RLS + Atomic Portfolio Chat Quota)

### FEAT — `tailoring_results` RLS + atomic portfolio chat quota

- **DB** (`supabase/migrations/20260418000000_rls_tailoring_results_and_audit_docs.sql`): Locked down `tailoring_results` with owner-only RLS. Added inline audit-doc comments on related tables.
- **DB** (`supabase/migrations/20260418000001_atomic_portfolio_chat_quota.sql`): Atomic per-portfolio-visitor chat quota check + decrement RPC, eliminating a check-then-decrement race in `ask-portfolio`.

**Files changed**: `supabase/migrations/20260418000000_*.sql`, `supabase/migrations/20260418000001_*.sql`, `project-governance/CHANGELOG.md`.

---

## 2026-04-17 (Security — RLS Hardening + Portfolio noindex)

### SEC — Explicit RLS block policies + portfolio SEO control

- **DB** (`supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`): Added explicit-block RLS policies to `credit_transactions` (clients SELECT only, INSERT/UPDATE/DELETE blocked), `subscriptions` (SELECT only — lifecycle managed by Stripe via service role), idempotently removed an obsolete UPDATE policy on `ai_credits`, and blocked all client access to `rpc_rate_limits` (only accessible via SECURITY DEFINER RPCs). Avatar storage bucket now enforces `image/*` MIME types server-side with a 5 MB cap.
- **DB** (`supabase/migrations/20260417000001_portfolio_noindex_and_rpc_update.sql`): Added `portfolio_settings.seo_noindex BOOLEAN`. Updated `get_public_portfolio` RPC to return `seoNoindex`. `usePortfolioSEO.ts` injects `<meta name="robots" content="noindex, nofollow">` when true.
- **Edge** (`supabase/functions/_shared/logger.ts`): New JSON-formatted edge function logger with DEBUG/INFO/WARN/ERROR levels and structured error serialization. Adopted in `creditUtils.ts` and `authMiddleware.ts`.
- **Cleanup**: Deleted `supabase/functions/_shared/deductCredits.ts` (no longer imported after the atomic credit refactor — see Decision #10).

**Files changed**: `supabase/migrations/20260417000000_*.sql`, `supabase/migrations/20260417000001_*.sql`, `supabase/functions/_shared/logger.ts`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/_shared/authMiddleware.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-16 (Performance + Atomic Credit Deduction)

### PERF/SEC — Performance indexes + atomic credit deduction RPC

- **DB** (`supabase/migrations/20260416000000_add_performance_indexes.sql`): Added indexes on every high-traffic column — all `user_id` foreign keys, `ai_credits.usage_date`, the rate-limit lookup keys, etc.
- **DB** (`supabase/migrations/20260416000001_atomic_credit_deduction.sql`): Introduced `atomic_attempt_and_deduct_credit` SECURITY DEFINER RPC that performs the credit check + increment in one transaction. All AI edge functions now route credit enforcement through `_shared/creditUtils.ts` → `checkAndDeductCredit`. See Decision #10.
- **`supabase/functions/_shared/creditUtils.ts`**: Now verifies that a key row exists in `user_api_keys` before granting BYOK unlimited credits — `ai_provider` preference alone is no longer sufficient.
- **`supabase/functions/hard-purge/index.ts`**: Wrapped in `requireAdminAuth`. Previously had no authentication.

**Files changed**: `supabase/migrations/20260416000000_*.sql`, `supabase/migrations/20260416000001_*.sql`, `supabase/functions/_shared/creditUtils.ts`, `supabase/functions/hard-purge/index.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/DECISIONS.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-15 (Wise AI Phase 3 — Tool Cache)

### FEAT — `tool_cache` table for Wise AI tool output reuse

- **DB** (`supabase/migrations/20260415165312_tool_cache.sql`): New `tool_cache` table — `(user_id, tool_name, cache_key, output JSONB, expires_at)` with a 7-day TTL and a unique index for upsert. RLS: owner only.
- **`src/hooks/useToolCache.ts`** (new): `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge` — RLS-safe reads/writes.
- **`AgenticChatSheet`**: Inline cache-reuse card shows cached company-briefing age → "View Saved Briefing" or "Generate Fresh." `CompanyBriefingSheet` accepts new props `initialCompanyName`, `initialBriefing`, `onBriefingGenerated` and auto-generates when a company name arrives without cached data.

**Files changed**: `supabase/migrations/20260415165312_tool_cache.sql`, `src/hooks/useToolCache.ts`, `src/components/editor/AgenticChatSheet.tsx`, `src/components/wise-ai/CompanyBriefingSheet.tsx`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`.

---

## 2026-04-15 (Release v2.5.4)

- Updated the app version to v2.5.4.
- Added a new plain-language changelog entry for users.
- Improved the admin email search so it waits briefly before running lookups while you type.

---

## 2026-04-15 (Task #8 — Wise AI Phase 1: Chat Persistence + History)

### FEAT — Wise AI chat session persistence (spec: 002-wise-ai-agent-evolution)

- **DB** (`supabase/migrations/20260415161238_chat_sessions.sql`): Two new tables with RLS. `chat_sessions` (id, user_id FK→auth.users CASCADE, resume_id FK→resumes SET NULL, title, created_at, updated_at) + `chat_messages` (id, session_id FK→chat_sessions CASCADE, role CHECK IN ('user','assistant'), content, function_call JSONB). Sessions are never auto-pruned (the 50-session limit is a UI display cap only via `.limit(50)` in `useChatSessions`). Performance indexes on `(user_id, updated_at DESC)` and `(session_id, created_at ASC)`.
- **`src/lib/agenticChat.ts`**: Added `action?: 'delete' | 'update'` to `SuggestionProposal` interface to support the delete-experience confirmation flow.
- **`src/hooks/useChatHistory.ts`** (new): TanStack Query hooks — `useChatSessions()` (50-session list ordered by `updated_at DESC`, enabled only when authenticated), `useSessionMessages(sessionId)` (messages for a session), `useDeleteChatSession()` (mutation with cache invalidation).
- **`src/hooks/useAgenticChat.ts`**: Full persistence layer added. On mount loads the latest session from DB (once per auth session). `sessionIdRef` tracks active session; session row created on FIRST user message with title derived from message text (first 50 chars; "Chat — [date]" if < 10 chars). All user and assistant messages persisted fire-and-forget via `persistMessage()`. New public exports: `startNewSession()` (clears messages + nulls sessionId), `loadSession(id)` (loads a historical session's messages from DB + sets sessionId). Added `delete_experience` acceptance logic in `applySuggestion`: when `action === 'delete'` and `section === 'experience'`, filters the matching entry from `currentResume.experience` via identifier lookup.
- **`src/hooks/useChatHistory.ts`** (new): see above.
- **`supabase/functions/agentic-chat/index.ts`**: Added `delete_experience` tool (params: `identifier`, `explanation`, optional `itemId`). Handler looks up the matching experience entry in `currentResume`, builds a human-readable description of the entry, and returns a `SuggestionResult` with `action: 'delete'` — the frontend shows a confirmation card before applying. `SuggestionResult` interface extended with `action?: 'delete' | 'update'`.
- **`src/components/editor/AgenticChatSheet.tsx`**: History panel added behind a Clock icon button in the header. Toggles between `'chat'` and `'history'` panel states. History view: session list (title + date) with two-step inline delete confirm (Trash2 → Delete/Cancel). Clicking a session loads it via `loadSession()` and returns to chat view. Empty state shown when no sessions exist. New `DeleteConfirmCard` component: renders for `proposal.action === 'delete'` proposals — shows "Entry to remove" block with destructive styling + "Yes, Delete" / "Cancel" buttons instead of the standard Before/After diff. `FunctionCallBadge` updated with `delete_experience → 'Deleted Experience'` label. `clearChat` replaced with `startNewSession` throughout.

**Files changed**: `supabase/migrations/20260415161238_chat_sessions.sql`, `src/lib/agenticChat.ts`, `src/hooks/useChatHistory.ts` (new), `src/hooks/useAgenticChat.ts`, `supabase/functions/agentic-chat/index.ts`, `src/components/editor/AgenticChatSheet.tsx`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Task #7 — Build from Text resume creation mode)

### FEAT — "Build from Text" in CreateResumeDialog

- **`CreateResumeDialog.tsx`**: Added fifth `CreateMode` value `'paste'`. New "Build from Text" option appears in the mode picker (after "Import Profile"). Mode renders a textarea for freeform career text and an optional title input. On submit, calls `parse-linkedin` edge function with `platform: 'generic'`, maps the parsed `ProfileData` to `ResumeData` (same field mapping as `showLocalImport`), creates the resume via `useResumeMutations.createResume`, and navigates to `/editor`. Errors render inline below the textarea (no toast). Loading state shows "Building..." on the submit button. State (`pasteText`, `pasteTitle`, `pasteError`) is reset in `resetAndClose`.
- **`parse-linkedin/index.ts`** — `generic` platform hint updated: added explicit instruction that input may be informal or bullet-point notes, and that AI must never invent data not present in the text.
- **Intent**: Competes directly with Google's "Smart CV Generator" — lets users build a structured resume from any unstructured career text (notes, a bio, informal bullet points) without needing a polished LinkedIn export or PDF.

**Files changed**: `src/components/dashboard/CreateResumeDialog.tsx`, `supabase/functions/parse-linkedin/index.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Governance — AI System Architecture Amendment)

### GOV-AI-AUDIT — AI System Governance Update

A full audit of all AI providers, AI Studio tools, and Supabase edge functions was run on 2026-04-15. Findings were used to expand `project-governance/ARCHITECTURE.md` and promote four structural observations into enforceable governance rules.

**Section 2 (Modification Rules) — Four new enforceable rules added:**
- **Rule A — Four-Layer Security Invariant**: Every new AI endpoint must enforce, in order: JWT auth → rate limit → atomic credit check → payload size guard. BYOK users bypass credit check only.
- **Rule B — Deterministic Scoring is Sacred**: `score-resume` uses no AI and must not deduct credits. Its `_shared/scoringFunctions.ts` logic must remain deterministic. Replacing it with AI requires a spec + constitution amendment.
- **Rule C — Orphan Function Retention**: `fetch-github-projects` is retained pending UI wiring ("Sync GitHub" in portfolio settings). Deletion without explicit owner sign-off is a governance violation.
- **Rule D — Voice Pipeline Change Protocol**: The three-layer interview voice pipeline (ElevenLabs STT → Gemma LLM → browser TTS) must be validated end-to-end before any change merges.

**Section 8 (AI System Architecture) — Expanded with:**
- Credit system clarifications: 2-credit cost for `tailor-resume`/`generate-cover-letter`; `score-resume` credit exemption noted.
- BYOK Strict Mode and hard-vs-skippable error distinction documented.
- Full 8-step AI routing priority chain (previously only 3 steps documented).
- AI Studio Tools Inventory: all 15 tools listed by category with edge function mappings.
- `wise-ai-chat` dispatch map: all 7 accepted `type` values with purpose descriptions.
- Voice Interview Pipeline: three-layer diagram, fallback path, and scoring behaviour documented.
- Key Frontend AI Hooks table: `useAIAction`, `useAICredits`, `useVoiceInterview`, `useAIEnhance`, `usePlan`.

**Files changed**: `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## [Unreleased] — 2026-04-18 — Task #28: AI Provider panel hardening

### Added
- **Server-side proxy endpoints** (`GET /api/admin/ai-provider/openrouter-status`, `/groq-models`, `/gemini-models`): managed API keys never leave the server; guarded by `requireAuthHeader + requireAdminEmail`.
- **Circuit breaker status chips** on every sub-panel (OpenRouter / Groq / Gemini / Ollama) — fetches `ai-breaker-status` edge function on panel load; shows open/degraded/healthy state with seconds-to-reset countdown when open; red dot on tab when breaker is open.
- **Confirm-before-switch inline card**: clicking a model in any sub-panel now shows an inline Confirm / Cancel card — no accidental active-model changes.
- **Test button** on OpenRouter and Groq panels: calls `ai-test` edge function with the DevKit admin password; shows latency, model ID, and a preview snippet on success.
- **Dynamic Gemini model list**: fetches live list from managed `GEMINI_API_KEY` via server proxy; falls back to static list when key is unconfigured.
- **Dynamic Groq model list**: fetches live list from managed `GROQ_API_KEY` via server proxy; falls back to static list when key is unconfigured.
- **Managed OpenRouter credit display**: fetches balance and rate-limit info from server proxy; shows remaining credit / limit / free-tier badge.
- **Feature routing collapsible section** at top of panel: shows which managed sub-provider handles each feature (Resume Analysis, Tailoring, Cover Letter, Interview, Agentic Chat) based on current `wiseresumeSubProvider` setting.

### Changed
- `AIProviderPanel.tsx` fully rewritten (703 → 730 lines): static model lists replaced by live proxy data, client-side direct API calls eliminated, confirm-before-switch UX added.

### Security
- OpenRouter, Groq, and Gemini managed API keys are now exclusively accessed server-side; zero key material in browser.
