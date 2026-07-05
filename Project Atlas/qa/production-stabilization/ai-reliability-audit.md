# Phase 6 — AI Reliability Audit Report

**Date:** 2026-07-05
**Status:** Complete — Code-level analysis and architecture audit; live AI output quality requires browser session
**Auditor:** AI Agent

---

## 1. AI Architecture Overview

```txt
[Client Browser]
    │
    ├── ai-gateway (all AI except resume-section-ai + job-import)
    │      ├── OpenRouter (primary with multiple API keys)
    │      ├── Groq (fallback)
    │      ├── DeepSeek (fallback)
    │      └── NVIDIA (fallback)
    │
    ├── resume-section-ai (standalone — resume section improvements)
    │      ├── OpenRouter
    │      ├── Groq
    │      └── DeepSeek
    │
    └── job-import (standalone — job description parsing)
           ├── Groq
           ├── OpenRouter
           └── DeepSeek
```

---

## 2. AI Feature Inventory

| Feature | Hub | Credit Cost | Provider Routing | Status |
|---------|-----|-------------|-----------------|--------|
| `tailor-resume` | `ai-gateway` | 3 credits | DeepSeek → Groq → OpenRouter → NVIDIA | ✓ |
| `analyze-resume` | `ai-gateway` | 1 credit | Same pool | ✓ |
| `score-resume` | `ai-gateway` | 0 (free) | Same pool | ✓ |
| `generate-cover-letter` | `ai-gateway` | 3 credits | Same pool | ✓ |
| `company-briefing` | `ai-gateway` | 3 credits | Same pool | ✓ |
| `wise-ai-chat` | `ai-gateway` | 1 credit | Same pool | ✓ |
| `interview-coach` | `ai-gateway` | 1 credit | Same pool | ✓ |
| `career-advisor` | `ai-gateway` | 1 credit | Same pool | ✓ |
| `ask-portfolio` | `ai-gateway` | 0 (owner) | Same pool | ✓ |
| `smoke-check` | `ai-gateway` | 0 | N/A (no real call) | ✓ |
| `enhance-summary` | `resume-section-ai` | 1 credit | OpenRouter → Groq → DeepSeek | ✓ |
| `enhance-bullets` | `resume-section-ai` | 1 credit | Same | ✓ |
| `suggest-skills` | `resume-section-ai` | 1 credit | Same | ✓ |
| `improve-writing` | `resume-section-ai` | 1 credit | Same | ✓ |
| `parse-job` | `job-import` | 1 credit | Groq → OpenRouter → DeepSeek | ✓ |
| `parse-resume` | `job-import` | 1 credit | Same | ✓ |

---

## 3. Provider Pool Configuration

### 3.1 ai-gateway Provider Pool

| Provider | Slots | Keys | Priority |
|----------|-------|------|----------|
| OpenRouter | 3 | OPENROUTER_KEY_1/2/3 | 1st (DeepSeek-first) |
| Groq | 3 | GROQ_KEY_1/2/3 | 2nd |
| DeepSeek | 1 | DEEPSEEK_KEY | 3rd |
| NVIDIA | 3 | NVIDIA_KEY_1/2/3 | 4th |

**Finding AI-01**: Provider pool has redundant keys (3 per major provider) with fallback. Single point of failure mitigated by multiple providers and multiple keys per provider.

**Verdict**: GOOD — multi-provider resilience.

### 3.2 Provider Failover Logic (ai-gateway lines 3800-3890)

- Tries each candidate from pool in priority order
- Retries with next provider/candidate on HTTP error, timeout, or rate limit
- Falls through all providers before returning error

**Verdict**: PASS — proper failover with retry.

---

## 4. Credit System

### 4.1 Credit Architecture

| Component | Implementation | Status |
|-----------|---------------|--------|
| Server-side credit check | ✓ In `ai-gateway` and `resume-section-ai` | ✓ |
| Credit lock (ai-gateway) | ✓ `acquireCreditLock`/`releaseCreditLock` | ✓ |
| Credit lock (resume-section-ai) | ✗ **MISSING** | **P1** |
| Daily limit enforcement | ✓ Server-side per plan | ✓ |
| Persistent rate limit (ai-gateway) | ✓ DB-backed via `ai_request_logs` | ✓ |
| Persistent rate limit (resume-section-ai) | ✗ In-memory only | P2 |
| Idempotency check (ai-gateway) | ✓ `idempotency_cache` collection | ✓ |
| Idempotency check (resume-section-ai) | ✗ Missing | P2 |

### 4.2 Plan Daily Limits

| Plan | Daily Limit | Credit Cost per Action | Notes |
|------|-------------|----------------------|-------|
| Free | 5/day | Varies by action (1-3) | Server-enforced |
| Pro | 50/day | Same | Server-enforced |
| Premium | -1 (unlimited) | Same | Server-enforced |

**Finding AI-02**: `resume-section-ai` has a credit race condition where concurrent requests can each write a stale `daily_usage` value, effectively giving free AI calls. Documented in Phase 2 (RSA-01).

**Severity**: P1

---

## 5. Provider Response Handling

### 5.1 JSON Parsing

| Feature | Expected Format | Implementation | Status |
|---------|----------------|---------------|--------|
| `tailor-resume` | Structured JSON (tailored sections) | `parseTailorResult()` | ✓ |
| `analyze-resume` | Structured JSON (analysis + score) | `parseAnalysisResult()` | ✓ |
| `score-resume` | Numeric score | Direct parsing | ✓ |
| `generate-cover-letter` | Markdown text | Direct | ✓ |
| `company-briefing` | Structured JSON | `parseBriefingResult()` | ✓ |

**Finding AI-03**: Structured JSON parsing with fallback to text extraction for malformed responses. Error handling catches parse failures and returns user-friendly messages.

**Verdict**: PASS — robust parsing with fallbacks.

### 5.2 Provider Error Mapping

| HTTP Status | Mapping | User-Facing Message |
|-------------|---------|---------------------|
| 401/403 | `invalid_key` | "AI provider key is invalid" |
| 429 | `rate_limited` | "Rate limited, please wait" |
| 400/404 (model text) | `model_not_found` | "AI model not found" |
| Timeout (12s) | `timeout` | "AI provider timed out" |
| Other | `provider_error` | "AI provider error" |

**Verdict**: GOOD — comprehensive error mapping prevents raw provider errors from reaching users.

---

## 6. Token Limits and Timeouts

| Action | Max Tokens | Timeout | Notes |
|--------|-----------|---------|-------|
| `tailor-resume` | 4096 | 180s function | Long-running |
| `analyze-resume` | 2048 | 30s | |
| `cover-letter` | 2048 | 30s | |
| `company-briefing` | 4096 | 180s | Can be slow |
| `enhance-summary` | 1024 | 30s | |
| All ai-gateway calls | Feature-based | 12s per provider call | Per-provider timeout |

**Verdict**: PASS — timeouts are reasonable and enforced per-provider.

---

## 7. Security Considerations

| Check | Status | Notes |
|-------|--------|-------|
| Provider keys server-side only | ✓ | Never exposed to client |
| Raw provider payloads sanitized | ✓ | Errors mapped to user-safe messages |
| Rate limiting per user | ✓ | 60-second window + daily quota |
| Admin test nonce properly guarded | ✓ | HMAC-SHA256 with expiry |
| Prompt injection defenses | ✓ | System prompts instruct LLMs to treat input as data |
| Credit deduction exactly once | ⚠️ | Race condition in `resume-section-ai` |

---

## 8. Known Issues

| # | Issue | Severity | Component | Detail |
|---|-------|----------|-----------|--------|
| AI-01 | Credit race condition — concurrent requests can bypass daily limit | P1 | `resume-section-ai` | No credit lock; shared with `job-import` |
| AI-02 | No persistent rate limit — in-memory resets on cold start | P2 | `resume-section-ai` | Cross-instance bypass possible |
| AI-03 | No concurrency guard — user can fire unlimited concurrent requests | P2 | `resume-section-ai` | Amplifies credit race |
| AI-04 | Idempotency missing — duplicate requests not deduplicated | P2 | `resume-section-ai` | Could result in double charges |
| AI-05 | `daily_limit` stored in document — stale after plan upgrade | P2 | `resume-section-ai` | Always derive from plan config |
| AI-06 | `resume-section-ai` not routed through `ai-gateway` | P1 | Architecture | Weaker security posture |
| AI-07 | Error messages return raw `err.message` to client | P2 | `resume-section-ai` catch-all | Could leak internal details |
| AI-08 | Idempotency collection missing degrades silently in `ai-gateway` | P1 | `ai-gateway` | Allows duplicate charges when collection not created |

---

## 9. Summary

| Category | Verdict |
|----------|---------|
| Multi-provider fallback | ✓ GOOD — 4 providers, multiple keys each |
| Credit enforcement (ai-gateway) | ✓ GOOD — lock + optimistic write + rate limit |
| Credit enforcement (resume-section-ai) | ⚠️ P1 — race condition allows free AI calls |
| Error handling | ✓ GOOD — mapped to user-safe messages |
| Provider key security | ✓ GOOD — server-side only, not logged |
| Structured JSON parsing | ✓ GOOD — robust with fallbacks |
| Live AI output quality | UNVERIFIED — requires browser session |
| Idempotency | ⚠️ Partially — ai-gateway has it, resume-section-ai doesn't |

---

*End of Phase 6 AI Reliability Audit Report*
