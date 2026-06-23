# Auth Page Redesign + Vercel Preview Host Fix + AI Gateway VCS Disconnect — 2026-06-23

**Last verified:** 2026-06-23
**Type:** UI redesign + bug fix + infra/CI hygiene
**Branch / PR:** `claude/happy-bardeen-jsqvpj` → PR #117
**Sources:**
- `src/pages/AuthPage.tsx` — auth screen (login / register / forgot-password / claim-account)
- `src/hooks/usePublicPortfolio.ts` — `isAppHostname()`
- `src/AppInterior.tsx` — `customDomainHostname` logic (renders portfolio fallback for non-app hosts)
- Appwrite project `69fd362b001eb325a192` — function `ai-gateway`, GitHub-App installation `69fd518d91ac2b25574c`

---

## Overview

Three related pieces of work, all on PR #117:

1. **Auth page redesign** — reworked `AuthPage.tsx` from a single centered glass card into a
   **modern split-screen** layout (brand panel + form), email-only (no auth-method changes).
2. **Vercel preview host fix** — app routes (e.g. `/auth`) on Vercel preview/prod URLs were
   rendering *"Portfolio not found for this domain."* instead of the app. Fixed `isAppHostname()`.
3. **AI Gateway build-failure diagnosis + VCS disconnect attempt** — the `ai-gateway` function's
   GitHub-App auto-build fails on every push; root-caused and attempted an API disconnect.

---

## 1. Auth page redesign

**What changed (`src/pages/AuthPage.tsx`):**
- Two-column **split-screen**: left **brand panel** (logo + wordmark, headline *"Build smarter
  resumes with AI."*, three feature highlights with `lucide-react` icons, ambient gradient glows,
  trust footer) shown at `lg`+; collapses to a compact logo on mobile. Right column is the focused
  auth form.
- Added **per-view headings/subheadings**: *Welcome back* (login), *Create your account* (register),
  *Reset password* (forgot-password), *Claim your account* (claim-account) — replacing the previous
  single `cardTitle()` static string.

**Preserved verbatim (no behavior change):** email/password login & registration
(`createEmailPasswordSession`, `account.create`), branded password-reset & email-verification via
the `email-service` Appwrite Function, plan-intent handling (`signup_plan_intent`), `redirect` /
`mode` query params, and all accessibility attributes (`sr-only` labels, `role="alert"`,
`aria-describedby`). **No auth methods changed — still email-only.** (Social/OAuth was explicitly
declined; enabling providers is a Console action and not exposed via the Appwrite MCP.)

---

## 2. Vercel preview host fix

### Symptom
Opening any app path on a Vercel deployment — e.g.
`https://wise-resume-twc-git-<branch>-iam-magdy.vercel.app/auth` — rendered the full-page
*"Portfolio not found for this domain."* fallback instead of the app. This affected **all** app
routes on Vercel previews, making preview-based PR testing impossible.

### Root cause
`AppInterior.tsx` replaces the whole render tree with `<CustomDomainPortfolioWrapper>` whenever
`!isAppHostname(window.location.hostname)`. `isAppHostname()` only allow-listed `localhost`,
`127.0.0.1`, `*.thewise.cloud`, `wiseresume.app`, and `*.replit.dev/.co`. **Vercel hosts were not
listed**, so every `*.vercel.app` URL was treated as a custom portfolio domain — and custom-domain
portfolio lookup is a stubbed/non-functional feature, so it always returns "not found".

This is the **direct sibling** of the 2026-05-09 Replit preview-login fix (same mechanism, different
preview host).

### Fix applied
`src/hooks/usePublicPortfolio.ts` — extended the `isAppHostname()` allowlist:
```ts
(h.startsWith('wise-resume-twc') && h.endsWith('.vercel.app'))
```
Scoped to the project's own prefix so arbitrary `*.vercel.app` subdomains are **not** treated as app
hosts (keeps `isAppHostname` tight as the security boundary).

### Verification
- Vercel preview rebuilt (commit `7a44a27`) → `Ready`; `/auth` renders the redesigned split-screen
  page instead of the portfolio fallback.
- `localhost:3000` already worked (`localhost` was allow-listed) and continues to.

> **Note (potential owner follow-up):** mirroring the Replit fix, signing in from a Vercel host may
> also require registering the Vercel domain as an **Appwrite Web Platform** (else Appwrite returns
> `403 general_unknown_origin` on `POST /v1/account/sessions/email`). Not yet done for `*.vercel.app`.

---

## 3. AI Gateway build-failure diagnosis + VCS disconnect

### Symptom
On every push, the **"AI Gateway Hub (WiseResume)"** commit status fails with *"Build failed."* and
the Appwrite bot comments *"Build archive was not created at /mnt/code/code.tar.gz."*

### Root cause (confirmed)
The failing builds are `type: vcs` from Appwrite's **GitHub-App integration** with
**`providerRootDirectory` empty**. Instead of building `appwrite-hubs/ai-gateway` (1.5 MB,
`npm install` = 26 pkgs in ~2s ✅), it tars the **whole repo** (~6.75 MB of tracked source) and runs
`npm install` against the **main app's** `package.json` — whose `postinstall` downloads
Puppeteer/Chrome — so the builder is killed before packaging → *"Build archive was not created."*

Evidence: failed deployment `sourceSize` 6.75 MB vs the last-good (CLI) deployment's 1.5 MB;
`providerRepositoryName: WiseResume-TWC`, `providerBranch: main`, `providerRootDirectory: None`;
`npm install` in the function dir succeeds locally in ~0.5s.

**Production is NOT affected** — the function stays `live` on its last-good CLI deployment
(`6a39c386…`). Only the GitHub-App auto-builds fail (red CI noise). The intended/canonical deploy
path is the **manual** `.github/workflows/deploy-appwrite-hubs.yml` → `scripts/deploy_hubs.cjs`
(which also sets env vars + ensures schemas); the GitHub-App auto-deploy is redundant **and**
incomplete.

### Action taken (owner-approved: attempt via API)
`functions_update` on `ai-gateway` clearing the VCS link (`installation_id`,
`provider_repository_id`, `provider_branch`, `provider_root_directory` → empty), **re-supplying all
other config** (`execute: ["any"]`, `timeout: 180`, `commands`, `entrypoint`, `logging`, `scopes`,
vars) so nothing was reset. Confirmed post-update: `live: true`, active deployment unchanged.

### Open item / caveat
Appwrite **masks** the VCS connection fields in its API (they read empty even while the GitHub-App
keeps triggering builds), so the disconnect **cannot be 100% confirmed from the API** — the next
push is the real test (no `ai-gateway` build = disconnected). If it still fires, the guaranteed
fixes are: set `providerSilentMode: true` (stops posting the red check to PRs), or the one-click
**Console** disconnect (Functions → AI Gateway Hub → Settings → Configuration → Git).

---

## Out of scope / unrelated red checks

- **TestSprite Pre-Check — "No tests detected":** pre-existing repo gate, not introduced by this
  work. The redesign preserved all input `id`s and handlers, so existing auth tests remain valid.
