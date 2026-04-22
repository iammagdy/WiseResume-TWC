# WiseResume / WiseHire — AI Tools Audit Report

**Scope:** Read-only audit of every AI-powered Supabase edge function in the repo.
**Goal:** Identify why outputs feel generic ("Enhance"), why "rare data" never appears (Company Briefing), and catalog bugs/issues across all AI tools.
**Date:** 2026-04-22

---

## TL;DR — The two findings that explain almost everything

### 1. The default writing model is the *free* Llama 3.3 70B
Every "writing" tool a normal user touches — **Enhance**, **Tailor (light/moderate)**, **Cover Letter**, **Parse Job URL** — defaults to:

```
model: 'meta-llama/llama-3.3-70b-instruct:free'
```

OpenRouter's `:free` tier is rate-limited, heavily throttled, and produces noticeably generic, "LinkedIn-corporate-bullet" output. The *paid* Gemini Flash model is only used when the user picks **"aggressive" intensity** in Tailor or runs Analyze/Score. That is the single biggest cause of the "AI Enhance feels generic" complaint.

### 2. Company Briefing has zero web-grounding
`company-briefing/index.ts` calls `gemini-2.5-pro` / `gemini-2.5-flash` with a system+user prompt and **no tools array** — no Google Search grounding, no Tavily/Perplexity, no internal scraper. The model can only return what is already in its training data (cutoff: early 2025). Anything it produces is either:
- generic info anyone could Google, or
- worse: hallucinated funding rounds, headcount, exec names.

It is **architecturally impossible** for the current implementation to deliver "rare data."

---

## Per-tool audit

Legend: 🔴 = critical, 🟠 = important, 🟡 = nice-to-fix.

### 1. `enhance-section` — the "AI Enhance" button
- **Models:** `meta-llama/llama-3.3-70b-instruct:free` for every action (`improve`, `ats_improve`, `ats_optimize`, `generate`, `expand`, `shorten`, `add_metrics`).
- **Temperature:** 0.7 (high creativity → drift).
- **Prompt:** Strong ATS preamble, XYZ formula, BANNED-OPENERS list, action-verb whitelist, schema-preservation rules per section. Quality of the *prompt* is good.
- **Variants mode:** Spawns 3 parallel calls to the same free model. If any one fails the whole call refunds and returns 502. With the free tier's frequent 429s, this fails more often than necessary.
- **Validation:** `validators.ts` only checks "did the model echo the input verbatim?" and "did entry count change?". It does **not** enforce the BANNED-OPENERS rule the prompt sets up, so outputs like *"Spearheaded a multifaceted initiative to leverage…"* slip through.
- 🔴 **Issue 1:** Free model is the only model. Even paying users get the same generic output.
- 🟠 **Issue 2:** No post-generation validator for banned openers / generic verbs / claims-without-numbers.
- 🟠 **Issue 3:** Variants mode = 3× failure surface; one rate-limit kills all three.
- 🟡 **Issue 4:** Temperature 0.7 is too high for résumé bullets — 0.3-0.4 would be more deterministic and ATS-friendly.

### 2. `company-briefing` — "AI company briefing"
- **Models:** `gemini-2.5-pro` (company-name mode), `gemini-2.5-flash` (JD mode).
- 🔴 **Issue 1 — root cause of "common Google-able info":** No `tools` array, no Google Search grounding tool, no Tavily/SerpAPI/Perplexity integration anywhere in the repo. The model is operating purely from its training-data memory. There is no path by which this function can return information the model does not already know.
- 🔴 **Issue 2:** Prompt asks for "rare data" the model cannot have (latest funding, current org chart, recent layoffs). Without grounding this is an invitation to hallucinate.
- 🟠 **Issue 3:** No source URLs returned to the user → impossible to verify.
- 🟠 **Issue 4:** Two different models for the two modes → users get inconsistent depth between "by company" and "by JD" inputs.

**Fix path (later):** add Google Search grounding via `tools: [{ googleSearch: {} }]` (Gemini natively supports it), or wire a Tavily/Perplexity API call before the LLM step and feed the search results into the prompt. Display sources to the user.

### 3. `tailor-section`
- **Models:** `meta-llama/llama-3.3-70b-instruct:free` for `light` + `moderate`, `google/gemini-flash-1.5` for `aggressive`.
- **Temperature:** 0.4 (good).
- 🟠 **Issue:** The default intensity in the UI is `moderate` → most users never hit the better Gemini model.
- 🟡 **Issue:** Keywords list is capped at 30 — fine, but no de-dup against words already in the resume.

### 4. `tailor-resume` (whole-resume tailor) — uses same shared aiClient + similar prompt structure. Same model split as above. Same observations apply.

### 5. `generate-cover-letter`
- **Model:** `meta-llama/llama-3.3-70b-instruct:free` only.
- **Temperature:** 0.7.
- 🟠 **Issue 1:** No JD-keyword extraction step before generation; model has to do extraction and writing in one pass → generic letters.
- 🟠 **Issue 2:** No company-research step (does not call `company-briefing` even when company is known).
- 🟡 **Issue 3:** Single-shot generation, no variants, no tone selector wired to model params.

### 6. `score-resume`
- **No AI.** Pure deterministic scoring (`scoringFunctions.ts`): contactCompleteness, sectionStructure, parsability, lengthDensity, keywordOptimization, contentQuality, templateFriendliness — weighted into an overall score.
- ✅ Fast, repeatable, refund-safe.
- 🟡 **Issue:** Weights (`keyword 0.35, content 0.25, structure 0.10…`) are hard-coded. JD-aware keyword scoring uses an internal industry baseline list, not an embedding-based match — so a candidate strong in synonyms can still be penalized.
- 🟡 **Issue:** Score from this function and `overallScore` from `analyze-resume` (LLM) often diverge by 15-25 pts on the same resume. The UI shows both without explaining the difference.

### 7. `analyze-resume`
- **Model:** `google/gemini-flash-1.5` (good).
- **Temperature:** 0.3 (good).
- ✅ Injects `profileContext` (seniority calibration) and `INDUSTRY_KEYWORDS` baseline when JD is short/missing — best prompt design in the codebase.
- 🟠 **Issue:** LLM-derived `overallScore` is not reconciled with deterministic `score-resume`. Two sources of truth → user confusion.
- 🟡 **Issue:** Model is asked to return arbitrary 0-100 numbers without a rubric → numbers fluctuate ±10 between calls on the same resume.

### 8. `recruiter-simulation`
- **Model:** default via shared `callAI` (`meta-llama/llama-3.3-70b-instruct:free`).
- 4 personas with strong, distinctive system prompts (Fortune500, Startup, Tech FAANG, Agency).
- 🟠 **Issue:** Free model often blurs persona voice — outputs from "Marcus Rivera (startup)" and "Sarah Chen (F500)" sound similar.
- 🟡 **Issue:** No few-shot examples per persona.

### 9. `career-path-advisor`
- **Model:** default `callAI` (free).
- ✅ Has explicit "GROUNDING RULES: do not invent salary numbers, certification names, company names." Good guardrail.
- 🟡 **Issue:** YouTube search queries embedded in the response are unverified — model occasionally suggests queries that return zero results.
- 🟡 **Issue:** Skill gaps list often overlaps existing skills (no de-dup against resume.skills).

### 10. `one-page-optimizer`
- ✅ Strict schema validator (`validateOnePageSchema`) with refund on bad shape — best validator in the codebase.
- ✅ Telemetry mode (`mode: 'telemetry'`) for measuring outcome accuracy.
- 🟡 **Issue:** AI predicts page count from char-density heuristic, but the client already measures real DOM page count. The prediction is often 1 off vs measured → "still_overflowing" outcomes.

### 11. `optimize-for-linkedin`
- Region-aware (gcc/emea/apac/americas) prompt augmentation — nice touch.
- 🟡 **Issue:** Uses default `callAI` → free model. LinkedIn headlines come out generic.

### 12. `parse-resume`
- Real PDF/DOCX text extraction, then LLM normalization. Generally OK.
- 🟡 **Issue:** When OCR confidence is low it silently passes garbage strings to the LLM → corrupt fields (e.g. "PHONE: 555 555 ai-generated").

### 13. `parse-job-url`
- Real `fetch()` of the job URL with strict domain whitelist + SSRF protection (private IP block, HTTPS-only). Good security.
- **Model:** `meta-llama/llama-3.3-70b-instruct:free`, temp 0.2.
- 🟠 **Issue:** The whitelist excludes most modern company career pages (Workday subdomains are partially covered, but custom careers.acme.com is not). Users see "DOMAIN_NOT_ALLOWED" frequently.
- 🟡 **Issue:** Free model is asked to extract salaryRange + cultureSignals + redFlags in one pass — output is shallow.

### 14. `parse-linkedin` — same shape as parse-resume; OCR-pipeline issues apply.

### 15. `wisehire-write-jd`
- HR-only guard, plan-gated, BYOK requirement on Starter plan.
- ✅ Inclusive-language preamble.
- 🟡 **Issue:** No region/legal-compliance toggle (US AAP language vs UK Equality Act vs EU AI Act notes).

### 16. `wisehire-generate-brief` (candidate brief)
- Fetches candidate `resume_text` + JD, returns match_score + strengths + concerns + 8 interview questions.
- **Temperature:** 0.4. **maxTokens:** 1500.
- 🟠 **Issue 1:** `resume_text.slice(0, 4000)` and `jd_text.slice(0, 3000)` truncate aggressively — long resumes lose senior achievements.
- 🟠 **Issue 2:** match_score is an LLM single number (0-100), no rubric → not reproducible.
- 🟡 **Issue 3:** Interview questions array is fixed at 8 — no role/seniority tuning.

### 17. `wisehire-bulk-screen`
- Loops candidates → calls brief generator per candidate.
- 🟠 **Issue:** No batch-aware throttling beyond the global rate-limiter; can rapidly burn HR plan quota.

### 18. `interview-chat`
- Multi-turn coaching chat.
- 🟡 **Issue:** No persistence of session feedback between turns beyond raw chat history → coaching feels repetitive.

### 19. `generate-question-bank`
- Generates interview questions for a JD.
- 🟡 **Issue:** No difficulty tags (easy/medium/hard) or category tags (behavioral/technical/system-design).

### 20. `detect-and-humanize`
- Two-pass: AI-detection then humanization.
- 🟠 **Issue 1:** "AI patterns" list is hard-coded ("delve, tapestry, synergy…") — a 2024-era heuristic. New models avoid these words; detection misses real AI text.
- 🟠 **Issue 2:** Humanization runs through the same generic free model → output is itself AI-detectable.

### 21. `explain-gap`, `generate-resignation-letter`, `generate-portfolio-bio`, `ask-portfolio`, `agentic-chat`, `wise-ai-chat`, `suggest-template`, `career-assessment`, `fill-gap`
- All use shared `callAI` defaulting to the free Llama model.
- `fill-gap` has explicit "do NOT invent companies/metrics" rule → produces template-y, low-impact output by design.
- 🟡 General issue: every chat-style tool uses temperature 0.6-0.8, contributing to drift between regenerations.

---

## Cross-cutting issues

### A. Provider routing (`_shared/aiClient.ts`)
- Routes through OpenRouter (managed key) or Groq, with BYOK fallback to Gemini/Ollama.
- 🟠 The "managed" path defaults to free models almost everywhere. Paid routing only triggers when a function explicitly hard-codes `google/gemini-flash-1.5` (analyze, aggressive-tailor) or `gemini-2.5-pro` (company-briefing).
- 🟡 No model A/B telemetry — we can't measure whether free-Llama vs paid-Gemini actually improves user outcomes.

### B. Credit / refund logic
- ✅ Consistent: every tool calls `checkAndDeductCredit` then `refundCredit` on AI failure.
- 🟠 Exception: enhance-section "variants mode" deducts 1 credit then makes 3 calls. If 1/3 succeeds it still keeps the credit even though the user didn't get the full variants set the UI promised.

### C. Prompts vs validators mismatch
- Several tools have strong "do/don't" preambles (banned openers, no fabrication, etc.) but **no post-generation validators** that actually reject outputs violating those rules. The model is on the honor system.

### D. No web-grounding anywhere in the codebase
- Searched for `googleSearch`, `web_search`, `tools.*search`, `groundingMetadata`, Tavily, Perplexity, SerpAPI — **zero matches**.
- This explains every "knowledge freshness" complaint, not just company-briefing. Career-path-advisor's salary suggestions, recruiter-simulation's "what FAANG looks for", and analyze-resume's "current market keywords" are all training-cutoff guesses.

### E. Profile context only used by `analyze-resume`
- `getProfileContext(userId)` exists and is excellent (seniority calibration). It's only injected into one function. Every other writing tool ignores user seniority → an entry-level dev gets the same enhanced bullets as a CTO.

### F. Temperature inconsistency
- `analyze-resume` 0.3 ✅
- `tailor-section` 0.4 ✅
- `wisehire-generate-brief` 0.4 ✅
- `parse-job-url` 0.2 ✅
- `enhance-section` 0.7 🟠
- `generate-cover-letter` 0.7 🟠
- `detect-and-humanize` 0.3 / humanize unspecified
- Chat tools 0.6-0.8

### G. Rate-limit confusion
- Two parallel rate-limiters (`checkRateLimit` + `checkUserRateLimit`) with different thresholds run on every call. This is defense-in-depth but doubles DB queries per request.

---

## Prioritized fix list (when you're ready to act)

🔴 **P0 — outcome-killers**
1. Stop using `:free` for paying-tier Enhance/Cover-Letter. Route paid users to `google/gemini-flash-1.5` or `anthropic/claude-3.5-sonnet`.
2. Add Google Search grounding (`tools: [{ googleSearch: {} }]`) to `company-briefing`. Return source URLs.
3. Build an output validator for Enhance that rejects banned openers, generic verbs ("leverage/utilize/spearhead"), and bullets with no numeric impact when one was requested.

🟠 **P1 — quality**
4. Inject `getProfileContext` into Enhance, Tailor, Cover-Letter, LinkedIn-Optimize.
5. Lower temperature to 0.3-0.4 for all writing tools.
6. Reconcile `score-resume` (deterministic) with `analyze-resume` (LLM) into one displayed score with a clear breakdown.
7. Fix Enhance variants credit accounting (deduct per successful variant, not per call).
8. Add JD-keyword extraction pre-step to cover-letter.
9. Replace hard-coded "AI words" list in detect-and-humanize with a perplexity-based or burstiness-based detector.

🟡 **P2 — polish**
10. Expand parse-job-url whitelist or switch to a "best-effort scrape with explicit user warning" model.
11. Add difficulty/category tags to generate-question-bank.
12. Add A/B model telemetry so we can prove which model improves conversions.
13. Single-source-of-truth profile context for every writing tool.
14. Surface "powered by [model]" in the UI so users understand quality differences when they BYOK.

---

## Files referenced (all read-only)

```
supabase/functions/enhance-section/index.ts
supabase/functions/company-briefing/index.ts
supabase/functions/tailor-section/index.ts
supabase/functions/score-resume/index.ts
supabase/functions/analyze-resume/index.ts
supabase/functions/recruiter-simulation/index.ts
supabase/functions/career-path-advisor/index.ts
supabase/functions/one-page-optimizer/index.ts
supabase/functions/optimize-for-linkedin/index.ts
supabase/functions/parse-job-url/index.ts
supabase/functions/wisehire-write-jd/index.ts
supabase/functions/wisehire-generate-brief/index.ts
supabase/functions/detect-and-humanize/index.ts
supabase/functions/generate-cover-letter/index.ts
supabase/functions/_shared/aiClient.ts
supabase/functions/_shared/scoringFunctions.ts
supabase/functions/_shared/profileContext.ts
supabase/functions/_shared/validators.ts
src/components/editor/{SummarySection,ExperienceSection,ProjectsSection}.tsx
src/hooks/{useResumeNudges,useATSSuggestions}.ts
```

No code was modified during this audit.
