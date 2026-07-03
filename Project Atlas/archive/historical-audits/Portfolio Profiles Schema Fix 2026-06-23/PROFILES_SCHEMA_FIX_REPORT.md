# Profiles Portfolio Schema Fix

**Date:** 2026-06-23
**Branch:** `fix/profiles-portfolio-schema`
**Type:** production schema migration — fixes portfolio save/publish failing on `wiseresume.app`.

## Problem
Saving/publishing a portfolio on production failed with **"Could not save — a portfolio field is misconfigured. Please refresh and try again."** That toast fires when the profile write throws an Appwrite **"Unknown attribute"** error.

Root cause: the live `profiles` collection has only 20 attributes and is **missing the portfolio columns** the editor writes and `useProfile.ts` whitelists (`LIVE_PROFILE_ATTRIBUTES`, comment: *"these must be whitelisted or portfolio saves are silently dropped"*). The whitelisted-but-missing columns are sent to Appwrite and rejected, aborting the save at `updateProfile` (before anything else, including the new password writer).

**Pre-existing & unrelated to the password-persistence work:** the allowlist + column writes come from commit `1d9765c7` ("fix(ai,portfolio): … portfolio save"), before this session. PR #107/#108 never touched the `profiles` schema or these writes; the password deploy only touched `portfolio_settings` + the new hub.

## Missing columns (added by this fix — 18)
- **Strings (optional, nullable):** `portfolio_resume_id`(64), `portfolio_style`(64), `portfolio_layout`(64), `portfolio_font`(64), `portfolio_accent_color`(32), `portfolio_sync_mode`(32), `portfolio_meta_title`(256), `portfolio_meta_description`(1024), `availability_headline`(256), `github_url`(512), `website_url`(512), `twitter_url`(512), `contact_email`(254), `portfolio_draft_saved_at`(32)
- **Large strings (stringified JSON):** `portfolio_sections`(8000), `portfolio_extras`(250000), `portfolio_draft`(250000)
- **Boolean:** `open_to_work` (default false)

Note: `portfolio_theme` is intentionally NOT added — it is written but dropped by the allowlist (not in `LIVE_PROFILE_ATTRIBUTES`).

## Solution
- `scripts/setup_profiles_portfolio_schema.cjs` — idempotent; adds only the missing attributes; **never** changes collection permissions or existing documents; aborts if `profiles` is somehow absent (won't recreate the core collection).
- Wired into `deploy_hubs.cjs` (portfolio-settings deploy block) so a narrow `--only=portfolio-settings` deploy applies it with the approved deploy `APPWRITE_API_KEY` (matching the existing inline-schema precedent). No `target=all`. No frontend change (the editor already writes these columns).

## Validation
- `node --check scripts/setup_profiles_portfolio_schema.cjs` PASS
- `node --check scripts/deploy_hubs.cjs` PASS
- No TS/build change (scripts + docs only).

## Deployment plan
1. (approval) apply via narrow deploy: `Deploy Appwrite Hubs` (workflow_dispatch, branch ref) `target=portfolio-settings` → runs `setup_profiles_portfolio_schema.cjs` (+ re-runs portfolio_settings schema + re-deploys the function, idempotent).
2. Verify live (read-only): all 18 columns present; `profiles` permissions unchanged; existing docs valid.
3. Owner QA: save/publish a portfolio (succeeds); enable a password (now reachable); incognito gate works.
4. Merge PR; sync local main.

## ⚠️ Production schema mutation warning
This adds 18 attributes to the core `profiles` collection (incl. a ~250 KB JSON column). Additive, idempotent, backward-compatible; no permission change; no document mutation. Still a real production mutation — gated on owner approval.

## Final status
`READY_FOR_REVIEW` — pending the owner's explicit apply approval.
