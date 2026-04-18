# Project Atlas — Maintenance Protocol

**Last verified:** 2026-04-18

This file defines how the Atlas is kept honest. Everyone editing the Atlas — human or agent — must follow it.

---

## Three-surface documentation rule (governance — supreme)

`project-governance/CONSTITUTION.md` §6.5 + §6.6 require **every** accepted change to the platform to be documented in **all three** surfaces before the task is "done" — no exceptions:

1. **`Project Atlas/01-Currently Implemented/`** — engineering reference card (this folder).
2. **`Project Atlas/04-For You (Plain Language)/`** — plain-language paragraph for the owner. Required for every change. Write a full paragraph when the change is user-visible; a single sentence noting "no owner-visible change" is acceptable for purely internal refactors, but the file MUST still be edited.
3. **`project-governance/CHANGELOG.md`** — internal governance changelog entry.

The constitution is the source of truth for this rule. This file mirrors it for Atlas editors and extends the per-change mapping below. The in-app "What's New" page (`src/pages/WhatsNewPage.tsx`) is **not** part of this rule.

If a card is added under `01-Currently Implemented/` for a topic that has no fitting subfolder, place it under `01-Currently Implemented/stability-fixes/` (or another topical subfolder) and add it to that subfolder's `README.md` index.

---

## The five hard rules

### Rule 1 — Cite or don't claim
Every factual statement in any Atlas doc **must** trace back to a file path in this repo (or a `project-governance/` / `specs/` document). Citation format:

```
→ supabase/functions/_shared/aiClient.ts
→ supabase/functions/_shared/aiClient.ts:120-180   (when a line range is useful)
```

If a fact cannot be traced to a source, it does not belong in the Atlas. If the source is unclear, the doc must say so explicitly:

```
> ⚠️ Unverified — needs clarification from `<file path that should answer this>`.
```

### Rule 2 — Source‑tier header
Every Atlas doc starts with a header:

```
# <Title>

**Last verified:** YYYY-MM-DD
**Type:** <reference card | deep dive | overview | plain language | index>
**Sources:**
- <path to source file 1>
- <path to source file 2>
- …
**Canonical owner:** <which higher-tier doc / file is the supreme reference for this topic>
```

The "Canonical owner" line is what tells future readers where the **real** truth lives, so they can re-verify.

### Rule 3 — Last‑verified stamp
Every doc records the date it was last reconciled against its sources (`YYYY-MM-DD`). When you re-verify a doc, bump the date. **Never bump the date without actually re-reading the cited sources.**

### Rule 4 — Reference cards over essays
For pages / edge functions / tables: keep cards short — name, purpose, sources, and key facts. Long-form prose belongs in `01-Currently Implemented/critical-systems/` or links out to a governance / spec doc. **One file = one topic.** Future updates should touch one file at a time.

### Rule 5 — No invented features
If a feature, behavior, or table is not in the codebase, it does not go in `01-Currently Implemented/`. Use `02-Planned/` (committed-to but not built) or `03-Ideas/` (sketched but not committed). The Atlas never describes something that doesn't exist as if it does.

---

## Update protocol

When source files change, the corresponding Atlas docs must be re-verified within the same task (or as a follow-up task). The mapping below tells you which Atlas doc(s) to touch.

| If you change… | Re-verify… |
|---|---|
| Any `src/pages/<X>Page.tsx` | `01-Currently Implemented/pages/<x-page>.md` |
| Any `supabase/functions/<X>/index.ts` | `01-Currently Implemented/edge-functions/<x>.md` |
| Any `supabase/migrations/*.sql` adding/dropping a table | `01-Currently Implemented/database-tables/<table>.md` (and the index) |
| `src/integrations/supabase/types.ts` | The relevant table card(s) in `01-Currently Implemented/database-tables/` |
| `supabase/functions/_shared/aiClient.ts` | `01-Currently Implemented/critical-systems/02-ai-routing-chain.md` |
| `supabase/functions/_shared/creditUtils.ts` | `01-Currently Implemented/critical-systems/03-credits-and-byok.md` |
| `supabase/functions/_shared/rateLimiter.ts` | `01-Currently Implemented/critical-systems/04-rate-limiting.md` |
| `supabase/functions/_shared/authMiddleware.ts` or `token-exchange/` | `01-Currently Implemented/critical-systems/01-auth-bridge.md` |
| `src/components/dev-kit/*` or `admin-*` edge functions | `01-Currently Implemented/critical-systems/06-admin-dev-kit.md` |
| `src/pages/wisehire/*` or `wisehire-*` edge functions | `01-Currently Implemented/critical-systems/05-wisehire-phase-1.md` |
| `src/AppInterior.tsx` (routes) | `01-Currently Implemented/pages/README.md` (route map index) |
| `project-governance/DECISIONS.md` (deferred items) | `03-Ideas/README.md` (re-scan for new sketches) |
| `specs/001-wisehire-hr-platform/spec.md` | `02-Planned/wisehire-phases-2-4.md` |
| `specs/002-wise-ai-agent-evolution/spec.md` | `02-Planned/wise-ai-phases-2-3.md` |
| `Routing AI Providers/*` | `02-Planned/ai-routing-rollout.md` |
| `docs/ai_features_design.md` | `02-Planned/ai-features-8-pack.md` |
| `vite.config.ts` / build config / lazy-loading wrappers (`src/lib/lazyWithRetry.ts`) | The relevant `01-Currently Implemented/frontend-layer/` card or a `01-Currently Implemented/stability-fixes/` card. Plain-language: full paragraph in `04-For You (Plain Language)/current-features.md` or `…/stability-improvements.md` when user-visible (faster page, recovered chunk loads); otherwise a single-sentence "no owner-visible change" note in the same files. |
| Server-side scheduled jobs / background sweeps (`server/index.ts` intervals, retention sweeps) | A `01-Currently Implemented/stability-fixes/` card and the affected `database-tables/<table>.md`. Plain-language: full paragraph in `…/stability-improvements.md` when user-visible; otherwise a single-sentence note. |
| AI provider resilience (circuit breaker tables, BYOK error classification, fallback skips) | `01-Currently Implemented/critical-systems/02-ai-routing-chain.md` AND a `stability-fixes/` card. Plain-language: full paragraph in `…/stability-improvements.md` (faster fallback and clearer errors are user-visible by definition). |
| Component-level background work hygiene (visibility-paused polling, debounced scoring, Web Workers) | A `01-Currently Implemented/stability-fixes/` card. Plain-language: full paragraph in `…/stability-improvements.md` when the user notices smoother typing / uploads / less wasted quota; otherwise a single-sentence note. |
| Analytics / data-lifecycle changes (BRIN indexes, retention windows on `portfolio_visits`, `error_log`, `audit_logs`) | A `01-Currently Implemented/stability-fixes/` card and the affected `database-tables/<table>.md`. Plain-language: full paragraph in `…/stability-improvements.md` when user-visible; otherwise a single-sentence "no owner-visible change" note. |
| Governance changes themselves (constitution amendments, new ADRs, this maintenance file) | No new card under `01-Currently Implemented/` (governance is its own canonical source), but the affected Atlas indexes (`README.md`s) MUST be re-verified and bumped if the rule changes how the Atlas is maintained. Plain-language: a one-sentence note in `…/current-features.md` or `…/stability-improvements.md` recording the policy change. |

**Plain-language doc reminder.** The plain-language surface MUST be touched for **every** accepted change, not only user-visible ones. For user-visible changes (page speed, error recovery, message clarity, new admin endpoint, new automatic background task), update `Project Atlas/04-For You (Plain Language)/current-features.md` or `Project Atlas/04-For You (Plain Language)/stability-improvements.md` with a full paragraph. For purely internal refactors, a single-sentence "no owner-visible change" entry in the same files is acceptable — but skipping the surface entirely is not. The constitution (§6.5) treats any skipped surface as an incomplete task.

When you re-verify a doc, bump its `**Last verified:**` line. When a source moves or is renamed, update the citation.

---

## When governance and the Atlas conflict

`project-governance/` always wins. If a governance file says X and an Atlas card says Y:

1. Re-read the cited source.
2. Fix the Atlas card.
3. Bump the Atlas card's last-verified date.
4. **Never** edit the governance file to match the Atlas.

---

## Adding a new doc to the Atlas

1. Pick the right folder (`01` / `02` / `03` / `04`).
2. Copy the appropriate template from `_templates/`.
3. Fill in the header (last-verified, sources, canonical owner).
4. Write only what is sourced.
5. Add the new file to the parent folder's `README.md` index.

---

## Pre-publish verification checklist

Before opening a PR that adds or edits any Atlas doc, the editor must tick every box for every changed file:

- [ ] **Header complete.** `Last verified`, `Type`, `Sources` (≥ 1 file path), and `Canonical owner` are all present.
- [ ] **Sources are file paths**, not generic prose ("see governance" is **not** acceptable; `project-governance/PRODUCT.md` § 3 is).
- [ ] **Per-claim citations.** Every factual statement in the body is traceable. Two acceptable patterns:
  - **Inline citation** at the end of the sentence/row: `… 5 credits/day on Free tier (→ project-governance/PRODUCT.md § 2).`
  - **Header-source coverage** when the claim is unambiguously sourced by one of the files listed in the doc's `Sources` block AND the body has no other unsourced facts.
- [ ] **Canonical owner is real.** Pointing at a file that doesn't exist or doesn't actually own the topic is a Rule 1 violation.
- [ ] **Plain-language docs** (folder 04) contain **zero** engineering paths (`src/…`, `supabase/…`), zero route URLs, and zero placeholder values like `$X/mo`.
- [ ] **Last-verified date** has been bumped to today, and you actually re-read every file in `Sources`.
- [ ] **Index updated.** If you added a new card, the parent `README.md` lists it.
- [ ] **No invented features** (Rule 5). If it's not in the codebase, it lives in `02-Planned/` or `03-Ideas/`, not `01-Currently Implemented/`.

If any box can't be ticked, do not publish — fix the doc or move it to a more honest folder.

---

## Citation policy — what counts as "cited"

A claim is **cited** when a reader can open the named source path and verify the claim within that file (line range optional but encouraged for long files).

- **Whole-doc coverage** is acceptable for **reference cards** whose body content is a faithful summary of a small set of source files explicitly listed in the `Sources` block. Example: an edge function card whose body summarises only that function's `index.ts` does not need an inline `→` after every sentence — the `Sources` block already covers it.
- **Inline citations are required** when a doc combines facts from multiple files, when a fact is non-obvious, or when a fact would be hard to find in a long source file. Pricing, plan limits, decisions, dates, version numbers, and counts always require an inline cite.
- **Plain-language docs** (folder 04) are governed by their `Sources` header block — every fact in the body must be supported by one of those listed files. Body text must not point at engineering paths.
- **Indexes** (any `README.md` / `index.md`) cite their own scope (the folder or route map they index) plus the canonical governance file for that domain.

If you can't decide whether a fact needs an inline cite, add one. The cost of an extra citation is zero.

---

## Automated sync check

A lightweight script — `scripts/atlas-sync-check.ts` — guards the **inventory** of `01-Currently Implemented/` against the codebase. It compares:

- `src/pages/**/*.tsx` against `01-Currently Implemented/pages/**/*.md`
- Directories under `supabase/functions/` (excluding `_shared`) against `01-Currently Implemented/edge-functions/*.md`
- Tables declared in `src/integrations/supabase/types.ts` against `01-Currently Implemented/database-tables/*.md`

If any side is missing an entry, the script lists the missing/orphaned cards by name and exits non-zero. Run it locally with:

```
npx tsx scripts/atlas-sync-check.ts
```

The same script runs on every PR via `.github/workflows/atlas-sync-check.yml` (no path filters — every PR is checked).

The check enforces **existence only** — it does not verify that a card's content matches its source. Per-claim accuracy is still a manual discipline (Rules 1–5 above).

**Known divergences** between the live database and `src/integrations/supabase/types.ts` (e.g. tables that exist in production but haven't been pulled into the generated types yet) are tracked in `Project Atlas/.atlas-sync-allowlist.json`. Each entry must include a reason; when a divergence is resolved the entry must be removed (the script flags stale allowlist entries and fails).

## What is intentionally **not** automated

The auto-check covers card existence; the rest of the maintenance discipline is still manual. There is no tooling that enforces per-claim citations, last-verified bumps, or canonical-owner correctness. If those slip, the Atlas decays — re-verify the affected docs and bump the date.
