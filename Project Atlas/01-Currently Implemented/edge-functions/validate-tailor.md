# validate-tailor

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/validate-tailor/index.ts`, `supabase/functions/_shared/keywordScoring.ts`

---

## What it does

Two-phase validation of a tailored resume against a target job description. Returns deterministic keyword score + AI qualitative verdict.

**Method:** POST
**Auth:** `requireAuth`
**Body:** `{ originalResume: object, finalResume: object, jobDescription: string, mustHaveKeywords?: string[] }`

## Phase 1 — Deterministic (no AI, no credits)

Calls `computeDeterministicScores(keywords, finalText)` on `resumeToText(finalResume)`. Returns:

- `score` (0–100)
- `matched_keywords[]`
- `missing_keywords[]`

**Source of truth** for the score and keyword lists — Phase 2 cannot override these.

## Phase 2 — AI qualitative evaluation

AI returns issues, strengths, and verdict ONLY: `verdict ∈ {'weak'|'average'|'strong'|null}`.

**No credit deduction** — validation is bundled with the Apply step in the upstream tailor flow.

## Response shape

`{ score, matched_keywords, missing_keywords, issues, strengths, verdict }`

## Related

- `Project Atlas/01-Currently Implemented/edge-functions/tailor-resume.md` (the upstream flow that pays credits)
- `Project Atlas/01-Currently Implemented/stability-fixes/task-66-tailor-ai-reliability.md`
