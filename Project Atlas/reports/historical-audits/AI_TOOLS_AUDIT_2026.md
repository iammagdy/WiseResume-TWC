# WiseResume / WiseHire — AI Tools Full Audit
**Date:** May 2026  
**Scope:** All AI-powered edge functions and their frontend components  
**Analyst:** Replit Agent (read-only, no code changes)

---

## 1. Executive Summary

The platform contains **19 AI edge functions** (plus 2 functions that are commonly assumed to be AI but are not), served through **15+ frontend sheet/dialog components**. The toolset is large, mostly high-quality, and well-engineered — but it has grown organically and now contains several overlaps, one near-duplicate pair, a mislabelled non-AI function, and a few UX surfaces that duplicate each other. This report identifies every function, rates each one, flags all redundancies, and recommends concrete actions.

**Overall verdict:** The AI layer is solid. There is no dead weight to delete outright, but there are 4–5 targeted consolidations that would reduce maintenance burden and improve the user experience.

---

## 2. Inventory — Backend Edge Functions

### 2.1 WiseResume (Job Seeker Side)

| # | Function | What it does | AI? | Quality Rating |
|---|---|---|---|---|
| 1 | `agentic-chat` | Conversational AI that edits the resume via 11 tool calls (update sections, proofread, open job tracker, company briefing) | ✅ Yes | ⭐⭐⭐⭐⭐ |
| 2 | `analyze-resume` | Resume-vs-JD match analysis: match score, gap analysis, keyword report | ✅ Yes | ⭐⭐⭐⭐ |
| 3 | `career-assessment` | Career quiz → AI career map + strength summary (takes quiz answers + resume) | ✅ Yes | ⭐⭐⭐ ⚠️ |
| 4 | `career-path-advisor` | Career path analysis from resume only → next roles, skill gaps, alternatives, action steps | ✅ Yes | ⭐⭐⭐⭐ ⚠️ |
| 5 | `company-briefing` | Company research: overview, culture, recent news, interview prep tips | ✅ Yes | ⭐⭐⭐⭐ |
| 6 | `detect-and-humanize` | Two-action function: (a) score text for AI patterns + flag phrases, (b) rewrite text to sound more human | ✅ Yes | ⭐⭐⭐⭐ |
| 7 | `generate-cover-letter` | Cover letter generation from resume + JD. Multiple styles/tones | ✅ Yes | ⭐⭐⭐⭐ |
| 8 | `generate-portfolio-bio` | 6-in-1 portfolio function: bio text, SEO meta, case study write-up, translation, critique, testimonial prompt | ✅ Yes | ⭐⭐⭐⭐ ⚠️ |
| 9 | `generate-question-bank` | Interview question bank from resume + job/industry context, returned in categories | ✅ Yes | ⭐⭐⭐⭐ |
| 10 | `generate-resignation-letter` | Generates a professional resignation letter from user-provided inputs | ✅ Yes | ⭐⭐⭐ |
| 11 | `optimize-for-linkedin` | LinkedIn profile optimizer: headlines, About sections (short/medium/long), experience rewrites, keyword suggestions, regional variants | ✅ Yes | ⭐⭐⭐⭐⭐ |
| 12 | `parse-job` | 3-action JD parser: URL fetch+parse, paste text, LinkedIn profile import | ✅ Yes | ⭐⭐⭐⭐ |
| 13 | `parse-resume` | Parses resume from PDF/text upload into structured JSON | ✅ Yes | ⭐⭐⭐⭐ |
| 14 | `recruiter-simulation` | Simulates 5 recruiter personas reviewing the resume: hireability score, red flags, questions they'd ask, call factors | ✅ Yes | ⭐⭐⭐⭐⭐ |
| 15 | `resume-section-ai` | Core enhancement engine: 7 action modes (improve, add_metrics, generate_bullets, shorten, expand, ats_improve, fix_error) on any section | ✅ Yes | ⭐⭐⭐⭐⭐ |
| 16 | `score-resume` | **NOT AI.** Pure algorithmic ATS score using deterministic `scoringFunctions.ts`. No LLM call at all. | ❌ No | ⭐⭐⭐⭐⭐ (for what it is) |
| 17 | `smart-fit-rewrite` | Rewrites the longest sentences to trim a resume to a target page count | ✅ Yes | ⭐⭐⭐⭐ |
| 18 | `suggest-template` | Recommends the best resume template based on the user's data (industry, experience level, style) | ✅ Yes | ⭐⭐⭐ |
| 19 | `tailor-resume` | Tailors every section of a resume to a specific JD. Multiple intensity modes (light → aggressive). The most complex generation function. | ✅ Yes | ⭐⭐⭐⭐⭐ |
| 20 | `wise-ai-chat` | AI Studio hub: 7 standalone writing tools (cold email, rejection response, personal branding, portfolio bio, reference letter, salary negotiation, skills gap) dispatched via a `buildPrompt()` switch | ✅ Yes | ⭐⭐⭐⭐ ⚠️ |
| 21 | `ask-portfolio` | Public portfolio chatbot — answers visitor questions about the owner's experience using BYOK key + HMAC session token + atomic quota RPC | ✅ Yes | ⭐⭐⭐⭐ |

### 2.2 WiseHire (Recruiter/HR Side)

| # | Function | What it does | AI? | Quality Rating |
|---|---|---|---|---|
| 22 | `wisehire-bulk-screen` | Batch-screens up to 10 uploaded PDF resumes against a JD. Extracts PDF text, scores each in parallel, returns ranked results. | ✅ Yes | ⭐⭐⭐⭐ |
| 23 | `wisehire-generate-brief` | Generates a candidate brief (match score, strengths, concerns, interview questions, employment notes) from a stored candidate's resume text + JD | ✅ Yes | ⭐⭐⭐⭐ |
| 24 | `wisehire-talent-search` | **NOT AI.** Pure Postgres filter query on `talent_pool_profiles` with optional in-memory text match on name/headline. No LLM call. | ❌ No | ⭐⭐⭐⭐ (for what it is) |
| 25 | `wisehire-write-jd` | AI job description generator from a free-text brief. Returns structured JD (title, summary, responsibilities, requirements, benefits). | ✅ Yes | ⭐⭐⭐⭐ |

---

## 3. Inventory — Frontend AI Components

| Component | Calls | Notes |
|---|---|---|
| `AgenticChatSheet` | `agentic-chat` | Full chat UI, streaming, tool-call visualization, draft persistence, chat history, resume picker |
| `AIDetectorSheet` | `detect-and-humanize` | Detect + humanize; can load any resume section directly |
| `AIEnhanceSheet` | `resume-section-ai` | Batch mode across all 10 section types; 5 action modes; retry per section; variants mode |
| `ATSScanSheet` | Display only (data fed from parent via `analyze-resume`) | Pure display component; no direct function call |
| `BoostAllExperienceSheet` | `resume-section-ai` (ats_improve on experience only) | Narrower version of AIEnhanceSheet |
| `CareerPathSheet` | `career-path-advisor` | Tab UI: next roles, skill gaps, alternatives, action steps |
| `CompanyBriefingSheet` | `company-briefing` | Used in interview prep AND inside AgenticChatSheet |
| `GapFillerSheet` | `resume-section-ai` | Generates employment-gap experience entries by category |
| `JobAnalysisSheet` | `analyze-resume` | JD text input → match score + gap analysis |
| `LinkedInOptimizerSheet` | `optimize-for-linkedin` | Region picker, tabs for headlines / about / experience / skills, download all |
| `QuestionBankSheet` | `generate-question-bank` | Interview question bank by category |
| `RecruiterSimSheet` | `recruiter-simulation` | 5 persona picker, red flag apply-fix, draft restoration |
| `SmartFitWizardSheet` | `smart-fit-rewrite` + layout logic | Multi-stage convergence UI (measure → score → AI → converge → finalise); targets 1/2/3 pages |
| `TailorSheet` | `tailor-resume` + `generate-cover-letter` + `parse-job` | Largest component (1,809 lines). Integrates tailoring, cover letter, JD parsing, keyword matching, multi-job compare. |
| **AI Studio sheets (×7)** | `wise-ai-chat` | `ColdEmailSheet`, `JobRejectionSheet`, `PersonalBrandingSheet`, `PortfolioBioSheet`, `ReferenceLetterSheet`, `SalaryNegotiationSheet`, `SkillsGapSheet` |
| `PortfolioBioSheet` (in AI Studio) | `wise-ai-chat` (`portfolio_bio` action) | See overlap §4.2 |
| `AICritiqueSheet` | `generate-portfolio-bio` (`critique` action) | Portfolio site critique |

---

## 4. Overlaps and Redundancies

### 4.1 🔴 HIGH — career-path-advisor vs career-assessment (Near-Duplicate)

**Problem:** These two functions do almost exactly the same job.

| Attribute | `career-path-advisor` | `career-assessment` |
|---|---|---|
| Primary input | Resume data | Resume data + quiz answers |
| JSON schema output | next roles, skill gaps, industry alternatives, action steps | careerMap, strengthSummary (+ same role/gap fields) |
| System prompt structure | Identical pattern | Identical pattern, with quiz context injected |
| Frontend | `CareerPathSheet` | `CareerQuizSheet` |
| Differentiation | Resume-only, instant | Quiz-gated, adds strength framing |

**Assessment:** The quiz version (`career-assessment`) is a superset. The difference is meaningful — quiz answers make the output more personalised — but the prompts are so similar that a single function with an optional `quizAnswers` field would cover both. As-is, any prompt improvement must be made in two places.

**Recommendation:** Merge into one `career-advisor` function. When `quizAnswers` is absent, run in "resume-only" mode; when present, inject them for deeper personalisation.

---

### 4.2 🟠 MEDIUM — portfolio_bio in wise-ai-chat vs generate-portfolio-bio

**Problem:** Two separate functions both generate portfolio bio text from resume data.

- `wise-ai-chat` with `action: 'portfolio_bio'` → AI Studio's `PortfolioBioSheet`
- `generate-portfolio-bio` with `action: 'bio'` → Portfolio editor's bio generation

**Assessment:** These serve different surfaces (AI Studio vs Portfolio Editor) but produce the same artefact and use near-identical prompts. A user could generate two bios with different quality levels without knowing why.

**Recommendation:** Route `wise-ai-chat`'s `portfolio_bio` action to call `generate-portfolio-bio` internally (or extract the shared prompt logic into `_shared`). This ensures the bio quality is always consistent regardless of entry point.

---

### 4.3 🟠 MEDIUM — BoostAllExperienceSheet vs AIEnhanceSheet (Duplicate UX surface)

**Problem:** `BoostAllExperienceSheet` is a sheet that runs `ats_improve` on the experience section. `AIEnhanceSheet` does exactly the same thing when the user selects "Experience" and picks "ATS Improve" mode.

**Assessment:** Two entry points to the same underlying call. `BoostAllExperienceSheet` is simpler and fires automatically on open, which is a genuine UX shortcut. But it creates dead code surface and means bug fixes to the apply/merge logic must be tracked in two places.

**Recommendation:** Keep `BoostAllExperienceSheet` as a thin wrapper that opens `AIEnhanceSheet` pre-configured to experience + ats_improve mode, rather than duplicating the enhancement logic.

---

### 4.4 🟠 MEDIUM — Interview question generation across 3 functions

Three different functions each generate interview questions:

1. `generate-question-bank` — questions from resume + job/industry context, categorised (behavioural, technical, situational, company-specific)
2. `company-briefing` — includes interview tips and likely questions as part of company research
3. `wisehire-generate-brief` — generates interview questions for a specific candidate from the HR side

**Assessment:** These serve distinct audiences and contexts, so they are not truly redundant. However, the prompt logic for generating interview questions is copy-pasted in all three. A shared `_shared/interviewQuestions.ts` helper would prevent quality drift.

**Recommendation:** Extract the interview-question generation prompt into a shared utility. Keep all three functions as entry points.

---

### 4.5 🟡 LOW — JobAnalysisSheet vs TailorSheet (UX overlap)

**Problem:** Both sheets accept a job description and show a resume-vs-JD match score.

- `JobAnalysisSheet` → calls `analyze-resume` → shows match %, gap analysis
- `TailorSheet` → calls `tailor-resume` → also computes and displays a match score + keyword gaps before and after tailoring

**Assessment:** `TailorSheet` is the superset. A user who goes to tailor their resume sees everything `JobAnalysisSheet` shows, plus actionable rewrites. `JobAnalysisSheet` is a lighter, read-only diagnostic — useful as a "check before I decide to tailor" step.

**Recommendation:** No merge needed. But the two entry points in the editor's AI hub should be labeled more clearly to distinguish "diagnose" (`JobAnalysisSheet`) from "fix" (`TailorSheet`).

---

### 4.6 🟡 LOW — detect-and-humanize: two distinct features in one function

**Problem:** AI detection (read-only scoring) and humanization (content rewriting) are bundled in a single edge function and called from a single sheet with two sequential steps.

**Assessment:** This coupling makes sense as a user flow (detect → humanize) but creates an awkward credit model: detection is cheap/free, humanization is expensive/credits. If you ever want to offer free detection, you'd need to split them. The current function handles both gracefully today.

**Recommendation:** Document the intent clearly. If free-tier detection is planned, split into `detect-ai-text` and `humanize-text` at that time. No immediate action needed.

---

### 4.7 🟡 LOW — generate-portfolio-bio: 6 sub-actions may be over-loaded

**Problem:** `generate-portfolio-bio` handles: bio generation, SEO meta tags, case study write-up, translation into another language, critique/feedback, and testimonial prompt generation. These are 6 conceptually different tasks sharing one function boundary.

**Assessment:** The function works correctly, but it's large and harder to maintain. The SEO meta and translation actions in particular feel like utilities that don't belong alongside bio writing. Adding a 7th action in the future requires editing this already large file.

**Recommendation:** No immediate split needed, but consider moving `translate` and `seo` actions to a more general utility function if portfolio features grow further.

---

## 5. Mislabelled / Misunderstood Functions

### 5.1 score-resume — Not AI

`score-resume` invokes no LLM whatsoever. It runs a fully deterministic algorithm in `scoringFunctions.ts` that grades sections based on rules (bullet count, quantification, keyword density, format compliance). This is a feature, not a bug — deterministic scoring is fast, free, and consistent.

**Risk:** It is named and surfaced alongside AI tools, which may create user confusion about why results are instant and never vary. A tooltip or label clarifying "algorithmic score" vs "AI analysis" in the UI would help.

### 5.2 wisehire-talent-search — Not AI

`wisehire-talent-search` is a filtered Postgres query against `talent_pool_profiles` with optional client-side text search. It contains zero LLM calls. Text matching is done via JavaScript `.includes()` after the DB query returns.

**Risk:** If the talent pool grows large, the in-memory text filter will become a performance bottleneck. Postgres full-text search or `pg_trgm` would be more appropriate at scale.

---

## 6. Quality Assessment — Individual Function Deep Dives

### agentic-chat ⭐⭐⭐⭐⭐
The most sophisticated function in the codebase. Uses real tool-calling (11 tools), maintains conversation state across turns, supports streaming, integrates company briefing inline, and writes changes back to the resume store with diff previews. The UX in `AgenticChatSheet` is polished — tool-call visualization, draft restoration, chat history, resume picker. **No issues found.**

### tailor-resume ⭐⭐⭐⭐⭐
The most user-impactful function. Multiple intensity modes, section-by-section progress tracking, keyword match calculation, skill gap detection, cover letter integration. The `TailorSheet` frontend at 1,809 lines is the largest component in the codebase and handles the complexity well, though it is a maintenance burden. **No functional issues found.** Consider breaking `TailorSheet` into sub-components.

### resume-section-ai ⭐⭐⭐⭐⭐
Core workhorse. 7 well-differentiated action modes. The `AIEnhanceSheet` frontend has excellent error handling — per-section retry with exponential backoff, fatal vs transient error classification, batch progress, variants mode. **No issues found.**

### recruiter-simulation ⭐⭐⭐⭐⭐
Highly differentiated — nothing else in the app does this. The 5 persona system (startup, corporate, technical, executive, agency) produces genuinely varied and useful feedback. The "Apply Fix" flow that calls `resume-section-ai` with a `fix_error` action inline is elegant. Draft restoration is a nice touch. **No issues found.**

### optimize-for-linkedin ⭐⭐⭐⭐⭐
Excellent scope. Generates 5 headlines, 3 About section lengths, per-experience LinkedIn rewrites, skill suggestions, keyword list, and regional variants (Global/GCC/EMEA/APAC/Americas). The regional variants are a strong differentiator. **No issues found.**

### detect-and-humanize ⭐⭐⭐⭐
Solid dual-purpose tool. The flagged-phrase breakdown with severity levels (high/medium/low) and explanations is genuinely useful. The ability to load any resume section directly into the text area is a good UX touch. The `AIDetectorSheet` correctly warns that humanizing bullet points may reduce ATS impact. **No issues found.**

### smart-fit-rewrite ⭐⭐⭐⭐
Technically impressive. The `SmartFitWizardSheet` runs a multi-stage pipeline: measure (offscreen template render or char-count fallback), score sentences by importance, ask AI to shorten the longest ones, converge via iterative layout checks, finalise. Targets 1/2/3 page outputs. The convergence algorithm is complex but well-structured. **No issues found.**

### generate-portfolio-bio ⭐⭐⭐⭐
High value. The 6-action design (bio, seo, case-study, translate, critique, testimonial-prompt) covers the full portfolio content lifecycle. The critique action returning actionable improvement suggestions is particularly useful. **Minor concern:** the function is large; 6 very different actions share one file and one authentication/billing path. (See §4.7.)

### career-path-advisor ⭐⭐⭐⭐ ⚠️
Well-designed output schema (next roles with readiness scores, skill gaps with resources, industry alternatives, 30/60/90 day action steps). The results are genuinely useful. **Concern:** Near-duplicate of `career-assessment`. Any prompt improvement must be applied in two places. (See §4.1.)

### career-assessment ⭐⭐⭐ ⚠️
The quiz-gated flow adds value (quiz answers make the career map more personalised), but the function is so similar to `career-path-advisor` that it represents maintenance risk. **Concern:** Redundancy with `career-path-advisor`. (See §4.1.)

### wise-ai-chat ⭐⭐⭐⭐ ⚠️
A well-structured 7-tool hub. The `buildPrompt()` switch pattern is clean. Each tool (cold email, salary negotiation, reference letter, etc.) is meaningfully different. **Concern:** The `portfolio_bio` action overlaps with `generate-portfolio-bio`. (See §4.2.) The other 6 actions are unique and high-value.

### analyze-resume ⭐⭐⭐⭐
Returns a match score, keyword gaps per section, and improvement recommendations. Used both by `JobAnalysisSheet` (standalone) and as a precursor step in the ATS scan flow. Well-focused. **Minor concern:** overlaps slightly with the match-score display in `TailorSheet`, but serves a different user intent (diagnose vs fix). (See §4.5.)

### company-briefing ⭐⭐⭐⭐
Useful for interview prep. Returns company overview, recent news, culture signals, and likely interview questions. Also callable inline from `agentic-chat` (one of its 11 tools). **No issues found.**

### generate-question-bank ⭐⭐⭐⭐
Generates categorised questions (behavioural, technical, situational, company-specific) from resume + job context. The category breakdown is what makes it more useful than a generic "give me interview questions" prompt. **No issues found.** (See shared prompt note in §4.4.)

### generate-cover-letter ⭐⭐⭐⭐
Multiple tone/style modes. Integrated directly into `TailorSheet` so users can generate a cover letter immediately after tailoring. **No issues found.**

### wisehire-bulk-screen ⭐⭐⭐⭐
Handles up to 10 PDFs, parallel AI scoring, ranked output. The PDF text extraction is a simple ASCII strip — it works for most standard PDFs but will fail on image-based or heavily encrypted PDFs. Rate limits per plan tier are correctly enforced. **Minor concern:** The PDF text extractor (`extractTextFromPdfBuffer`) is regex-level naive. A real PDF parser library would improve coverage.

### wisehire-generate-brief ⭐⭐⭐⭐
Per-candidate brief with match score, strengths, concerns, interview questions, and employment flag notes. Good depth. Tier-differentiated rate limits (5/day Starter, 50/day Pro, unlimited Business+). **No issues found.**

### wisehire-write-jd ⭐⭐⭐⭐
Clean, focused JD generator with structured output (title, summary, responsibilities, requirements, benefits). Inclusive language instruction in the system prompt. Saves JD text back to the role record when `role_id` is provided. **No issues found.**

### parse-resume ⭐⭐⭐⭐
Solid structured extraction from PDF/text. **No issues found.**

### parse-job ⭐⭐⭐⭐
Three-mode parser (URL, paste, LinkedIn) covers all real-world JD acquisition patterns. **No issues found.**

### suggest-template ⭐⭐⭐
Functional but modest in ambition. Uses AI to recommend one of the available templates based on user data. The value depends heavily on how many templates exist and how differentiated the recommendation criteria are. **Improvement opportunity:** Richer reasoning (explain *why* a template was recommended) would make this more compelling.

### generate-resignation-letter ⭐⭐⭐
Niche but complete. Low usage expected relative to other tools. **No issues found.**

### ask-portfolio ⭐⭐⭐⭐
Well-architected for a public-facing endpoint. BYOK-only (portfolio owner supplies the key), HMAC session tokens, atomic quota RPC, no platform key fallback. This is correct: platform-funded tokens should not subsidise public visitors. **No issues found.**

---

## 7. Shared Infrastructure Assessment

### aiClient.ts ⭐⭐⭐⭐⭐
Flat provider pool (OpenRouter + Groq + DeepSeek) with BYOK override path, per-call retry logic, timeout handling, and a `modelRouter.ts` that maps each tool to the appropriate provider/model. Clean separation of concerns. Credit gating via `creditUtils.ts`.

### modelRouter.ts
Centralises the model-selection logic per tool. This is architecturally correct — adding a new tool only requires one line here rather than scattered config. No issues found.

---

## 8. Prioritised Recommendations

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 🔴 High | **Merge `career-path-advisor` + `career-assessment`** into one function with optional quiz payload | Medium | Eliminates prompt drift, halves maintenance surface |
| 🟠 Medium | **Route `wise-ai-chat` portfolio_bio through `generate-portfolio-bio`** (or share prompt logic via `_shared`) | Low | Ensures bio quality is consistent across both entry points |
| 🟠 Medium | **Refactor `BoostAllExperienceSheet`** to be a thin configurator for `AIEnhanceSheet` rather than a separate enhancement flow | Low | Eliminates duplicate apply/merge logic |
| 🟠 Medium | **Extract interview-question prompt** into `_shared/interviewQuestions.ts` used by all three generators | Low | Prevents quality drift across 3 call sites |
| 🟡 Low | **Add algorithmic vs AI labels** in the UI for `score-resume` vs `analyze-resume` to avoid user confusion | Low | UX clarity |
| 🟡 Low | **Label entry points clearly** in the AI hub: "Diagnose" (JobAnalysisSheet) vs "Fix" (TailorSheet) | Low | UX clarity |
| 🟡 Low | **Add `suggest-template` reasoning** — explain *why* a template was chosen | Low | Increased trust and usefulness |
| 🟡 Low | **Replace naive PDF text extractor** in `wisehire-bulk-screen` with a real parser at scale | Medium | Better bulk-screen accuracy on complex PDFs |
| 🟡 Low | **Add Postgres full-text search** to `wisehire-talent-search** instead of in-memory `.includes()` | Medium | Scalability at large talent pool sizes |
| ⬜ Future | **Split `detect-and-humanize`** into two functions if free detection is introduced | Low | Credit model flexibility |

---

## 9. What Is Working Well

- **Tool-calling agentic architecture** (`agentic-chat`) is correctly implemented and well-differentiated from the simpler tool buttons.
- **Per-section retry with error classification** in `AIEnhanceSheet` is production-grade error handling — rare to see this level of care in a startup codebase.
- **SmartFit convergence loop** is genuinely novel and technically impressive.
- **Recruiter personas** in `recruiter-simulation` produce meaningfully different feedback — this is not a gimmick.
- **Regional variants** in `optimize-for-linkedin` (GCC, EMEA, APAC, Americas) are a strong differentiator for a global user base.
- **BYOK + HMAC session tokens** in `ask-portfolio` correctly prevents platform key abuse by public visitors.
- **`modelRouter.ts`** centralises provider/model selection cleanly — adding a new tool is a one-liner.
- **`score-resume` being deterministic** is a correct architectural choice — ATS scoring should not vary between runs.

---

## 10. What Is Not Working / At Risk

- **`career-assessment` + `career-path-advisor` duplication** is the most concrete maintenance risk. Any prompt quality improvement must currently be applied twice.
- **`wise-ai-chat` portfolio_bio** produces a different-quality bio than `generate-portfolio-bio` for no user-visible reason.
- **`BoostAllExperienceSheet`** duplicates the apply/merge logic from `AIEnhanceSheet`. A bug in one does not automatically fix the other.
- **Interview question prompts** appear copy-pasted across 3 functions — quality improvements will drift.
- **`wisehire-talent-search`** will become a performance issue as the talent pool grows beyond a few thousand opted-in profiles.
- **`wisehire-bulk-screen`'s PDF extractor** is ASCII-strip only — image-based PDFs, right-to-left text, and heavily styled PDFs will extract as empty or garbled, silently producing `match_score: 0`.

---

*End of audit. No code was changed in producing this report.*
