# Feature Specification: Tailor Resume – Audit & Correctness Fixes

**Feature Branch**: `016-tailor-resume-audit`
**Created**: 2026-03-19
**Status**: Implemented

---

## Context

This spec is the result of a full code audit of the existing Tailor Resume feature. The feature is substantially implemented but contains several **correctness bugs**, **UX gaps**, a **security vulnerability**, and **dead-code risks** that must be addressed before it can be considered production-ready. This spec defines what correct behavior looks like and what must be fixed.

---

## User Scenarios & Testing

### User Story 1 — Apply tailored changes maps experience and education by ID, not by index (Priority: P1)

A user tailors their resume and clicks "Apply Changes." The resulting new resume must faithfully reflect the AI's changes for experience and education sections, matched by item ID — not by array position. If the AI returns experience entries in a different order than the original, the user's resume must not silently misalign job history.

**Why this priority**: Data integrity. A wrong-index merge can corrupt a user's work history — placing the wrong achievements under the wrong company. This is a silent data-loss bug.

**Independent Test**: Tailor a resume with 2+ experience entries; after applying, verify that each experience entry in the saved resume is matched to its correct original entry by `id`, not position.

**Acceptance Scenarios**:

1. **Given** a resume with experience entries `[A, B, C]` (by ID), **When** the AI returns tailored experience as `[B, A, C]`, **Then** the merged resume must associate each entry's enhanced content with its matching original ID — not the positional index.
2. **Given** a resume with education entries `[X, Y]`, **When** the AI returns only one education entry (partial response), **Then** the unmatched entry `Y` must be preserved unchanged from the original.
3. **Given** the AI returns an experience entry with an ID that does not exist in the original resume, **When** the user applies, **Then** that entry must be discarded — not appended to the resume.
4. **Given** the AI returns `education: []` (empty array) and the Education toggle is enabled, **When** the user applies, **Then** the merged resume's education section becomes empty — the toggle is respected without force-disabling it.

---

### User Story 2 — Credits are validated server-side in the edge function before the AI is called (Priority: P1)

A user with zero AI credits and no BYOK configured attempts to tailor a resume. The `tailor-resume` edge function itself must reject the request before calling `callAIWithRetry`, regardless of what the shared AI client does internally.

**Why this priority**: Direct revenue protection. Without an explicit credit gate at the edge-function level, a user bypassing the UI can consume unlimited AI tokens.

**Independent Test**: With a test user at zero credits and no BYOK, send a direct POST to `/functions/v1/tailor-resume`. The response must be HTTP 402 with no AI API call made (verify via provider logs or mock).

**Acceptance Scenarios**:

1. **Given** a user with `ai_credits = 0` and no BYOK, **When** they POST to `/functions/v1/tailor-resume`, **Then** the edge function must return HTTP `402 Payment Required` before invoking `callAIWithRetry`, and the credit balance must remain `0`.
2. **Given** a user with a valid BYOK and `ai_credits = 0`, **When** they POST to `/functions/v1/tailor-resume`, **Then** the credit check is bypassed and the request proceeds using the BYOK.
3. **Given** a user with sufficient credits (`ai_credits >= 1`) and no BYOK, **When** a tailor completes successfully, **Then** exactly `1` credit is deducted from their balance in Supabase.
4. **Given** a BYOK user completes a successful tailor, **When** the operation finishes, **Then** their platform credit balance is unchanged (`0` credits deducted).

---

### User Story 3 — JWT is verified with a proper signature check before trusting `userId` (Priority: P1)

The `tailor-resume` edge function currently decodes the JWT without verifying its signature. Any user who crafts a forged JWT with a fake `userId` can impersonate another user and consume their credits or access their data.

**Why this priority**: Security vulnerability. An unverified JWT makes the entire auth and credit system bypassable by a trivial forgery.

**Independent Test**: Send a POST to `/functions/v1/tailor-resume` with a JWT whose signature is invalid but whose payload contains a valid-looking `userId`. The request must be rejected with HTTP `401`.

**Acceptance Scenarios**:

1. **Given** a request with a JWT that has an invalid signature, **When** the edge function processes it, **Then** the request must be rejected with HTTP `401 Unauthorized` — the `userId` must not be trusted.
2. **Given** a request with a valid, correctly signed JWT, **When** the edge function processes it, **Then** the `userId` extracted from the token must be used for all subsequent credit checks and DB operations.
3. **Given** a request with an expired JWT, **When** the edge function processes it, **Then** the request must be rejected with HTTP `401`.

---

### User Story 4 — Retry logic only retries retryable errors (Priority: P2)

When the edge function returns a transient error (e.g., network glitch, model timeout), the client must auto-retry once. When the error is `rate_limit` or `credits_exhausted`, the client must NOT retry.

**Why this priority**: The retry gate is fragile — errors without a `.code` bypass it and retry unconditionally, risking double-charging or confusing UX.

**Independent Test**: Trigger a generic 500 error. Verify the client retries once. Trigger a 429 rate-limit error. Verify no retry occurs.

**Acceptance Scenarios**:

1. **Given** the edge function returns HTTP `500` with an unrecognized body, **When** the error is caught client-side, **Then** the client must display "Retrying — hang tight…", wait 2 seconds, and retry exactly once.
2. **Given** the edge function returns HTTP `429`, **When** the error is caught, **Then** the client must NOT retry and must immediately surface the rate-limit error card.
3. **Given** the edge function returns HTTP `402`, **When** the error is caught, **Then** the client must NOT retry and must immediately surface the credits-exhausted error card.
4. **Given** a retry succeeds after a transient failure, **When** results are returned, **Then** the progress UI continues normally.

---

### User Story 5 — Auto-tailor re-triggers only when a new URL is successfully parsed into a different `parsedJobInfo` (Priority: P2)

A user pastes a job URL. It is parsed and auto-tailor fires. The user clears the field and pastes a second, different job URL. Auto-tailor must fire again — but only because a new URL was successfully parsed, not because the user typed or cleared text.

**Why this priority**: `autoTailorTriggered.current` only resets on sheet re-open today. A second URL paste in the same session silently skips auto-tailor.

**Independent Test**: Open the sheet, paste URL A (auto-tailor fires). Clear the field, paste URL B (different job). Auto-tailor must fire a second time. Clear and retype raw text without a URL — no auto-tailor must fire.

**Acceptance Scenarios**:

1. **Given** the Tailor Sheet is open and URL A has already triggered auto-tailor, **When** the user pastes URL B and it parses into a `parsedJobInfo` different from the previous one, **Then** auto-tailor must fire again for the new job.
2. **Given** the user clears the job description field and types raw text (no URL), **When** no URL parse occurs, **Then** `autoTailorTriggered` must not reset and auto-tailor must not fire.
3. **Given** the user pastes the same URL a second time (same `parsedJobInfo`), **When** the parse completes, **Then** auto-tailor must NOT re-fire (no duplicate trigger for the same job).
4. **Given** the Tailor Sheet is closed and reopened, **When** a URL is parsed, **Then** auto-tailor fires as a fresh session.

---

### User Story 6 — Apply guards against null `currentResumeId` with a specific, recoverable error (Priority: P2)

If the user somehow reaches the Apply button without a resume selected (e.g., a race condition or deep-link edge case), the system must not create an orphaned resume record with no `parent_resume_id`. It must show a specific, actionable error message and keep the sheet open.

**Why this priority**: Silent orphaned DB records are hard to clean up and confuse users who find unnamed, unlinked resumes on their dashboard.

**Independent Test**: Simulate `currentResumeId = null` at apply time. Verify no Supabase insert is made, the toast says "Please select a resume before applying changes.", and the sheet stays open.

**Acceptance Scenarios**:

1. **Given** `currentResumeId` is `null` when the user clicks Apply, **When** `handleApplyChanges` runs, **Then** no Supabase `INSERT` is executed, the toast message "Please select a resume before applying changes." is shown, and the Tailor Sheet remains open.
2. **Given** `currentResumeId` is a valid string, **When** the user clicks Apply, **Then** the insert proceeds normally with `parent_resume_id` set to that value.

---

### User Story 7 — Legacy `tailorResume` function is removed (Priority: P3)

The codebase has two tailor invocation paths. The old `tailorResume()` has no active UI callers and is dead code. It must be removed to prevent accidental future use that would bypass progress tracking, credit classification, and error handling.

**Why this priority**: Dead code creates maintenance risk. Removal is low-risk and high-clarity.

**Independent Test**: After removal, grep for `tailorResume(` (excluding `tailorResumeWithProgress`) — zero results must be found.

**Acceptance Scenarios**:

1. **Given** no UI component calls `tailorResume()` directly, **When** the fix is applied, **Then** the function is deleted from `aiTailor.ts` with no replacement.
2. **Given** a caller of `tailorResume()` is discovered during the fix, **When** the fix is applied, **Then** that caller is migrated to `tailorResumeWithProgress()` before the old function is removed.

---

### Edge Cases

- **AI truncated experience response**: `tailorResult.experience` has fewer items than `currentResume.experience`. Unmatched originals must be preserved unchanged.
- **AI hallucinated new experience**: `tailorResult.experience` has items whose IDs don't exist in the original. Extra items must be discarded.
- **Empty section from AI**: AI returns `education: []` and the toggle is enabled. Apply results in an empty education list — the toggle is not force-disabled.
- **Sheet closes mid-apply**: `isApplying` must prevent double-submits. The pending tailor cache must not be cleared until the insert succeeds.
- **`overallScore` is null**: `job_match_score` must be stored as `NULL` in the database, not `0`.
- **Same URL pasted twice**: `autoTailorTriggered` must not reset for identical `parsedJobInfo` — no duplicate auto-tailor.

---

## Requirements

### Functional Requirements

- **FR-001**: The `handleApplyChanges` function MUST merge experience entries by matching `exp.id` against `currentResume.experience[i].id`, not by array index.
- **FR-002**: The `handleApplyChanges` function MUST merge education entries by matching `edu.id` against `currentResume.education[i].id`, not by array index.
- **FR-003**: Experience or education entries in `tailorResult` whose IDs do not exist in the original resume MUST be discarded.
- **FR-004**: Original experience or education entries not returned by the AI (partial response) MUST be preserved unchanged in the merged resume.
- **FR-005**: Projects, certifications, and awards MUST continue to use wholesale replacement (not ID-based merge) in this iteration.
- **FR-006**: The `tailor-resume` edge function MUST perform an explicit credit/BYOK check (against the Supabase DB) BEFORE calling `callAIWithRetry`, returning HTTP `402` if the user has `ai_credits = 0` and no valid BYOK.
- **FR-007**: A successful tailor operation MUST deduct exactly `1` AI credit from non-BYOK users. BYOK users MUST have `0` credits deducted.
- **FR-008**: The `tailor-resume` edge function MUST verify the JWT signature (or use a verified auth helper) before trusting the `userId` extracted from it. An invalid or expired JWT MUST return HTTP `401`.
- **FR-009**: The client retry in `tailorResumeWithProgress` MUST only retry on `generic`-coded errors. It MUST NOT retry on `rate_limit`, `credits_exhausted`, or `Unauthorized` errors.
- **FR-010**: `autoTailorTriggered.current` MUST reset (allowing re-fire) only when a URL is successfully parsed into a `parsedJobInfo` that differs from the previous one. Manual text edits and clears MUST NOT reset it.
- **FR-011**: If `currentResumeId` is `null` when Apply is clicked, `handleApplyChanges` MUST abort without any DB insert, show the toast "Please select a resume before applying changes.", and keep the Tailor Sheet open.
- **FR-012**: `job_match_score` MUST be stored as `null` in the database when `tailorResult.overallScore` is `null` (not `0`).
- **FR-013**: The legacy `tailorResume()` function in `aiTailor.ts` MUST be removed once confirmed to have no active callers.
- **FR-014**: The duplicate `console.log('Authenticated user:', userId)` in the edge function MUST be removed, leaving exactly one log line.

### Key Entities

- **TailoredResume**: A new `resumes` table row with `parent_resume_id` (source resume), `target_job_title`, `target_company`, `job_match_score` (nullable), and `job_url`.
- **TailorCache**: A localStorage entry keyed by `resumeId` with a 1-hour TTL. Stores `tailorResult`, `originalResume`, `jobDescription`, `parsedJobInfo`, `intensity`, and `jobUrl`.
- **SuperTailorResult**: Full AI response type — `summary`, `skills`, `experience[]`, `education[]`, `projects[]`, `certifications[]`, `awards[]`, `overallScore` (nullable), `sectionScores`, `missingSkills`, `boostableSkills`, `jobIntelligence`, `atsAnalysis`, `bulletTransformations`, `interviewTalkingPoints`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: After Apply, every experience entry in the saved resume is matched to its correct original entry by `id` — not position. Verified by comparing IDs in the DB record against the AI response order.
- **SC-002**: A direct POST to `/functions/v1/tailor-resume` with a zero-credit, no-BYOK user receives HTTP `402` with no AI provider tokens consumed.
- **SC-003**: A direct POST with a forged (invalid-signature) JWT receives HTTP `401`.
- **SC-004**: A successful tailor by a non-BYOK user results in the user's `ai_credits` being decremented by exactly `1`. A BYOK user's balance is unchanged.
- **SC-005**: Pasting two different job URLs in the same Tailor Sheet session results in exactly two auto-tailor invocations. Pasting the same URL twice results in exactly one.
- **SC-006**: Simulating `currentResumeId = null` at apply time produces no DB insert, shows the specific toast message, and leaves the sheet open.
- **SC-007**: `job_match_score` is stored as `NULL` (not `0`) in the DB when the AI omits `overallScore`.
- **SC-008**: No callers of the legacy `tailorResume()` function exist in the final codebase (`grep` returns zero results).
- **SC-009**: The edge function source contains exactly one `console.log('Authenticated user:', userId)` line.
