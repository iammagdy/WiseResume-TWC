# 05 — Cost & Capacity Model

> **Audience:** Mixed. Section 1 ("The headline number") is for you. Sections 2+ get into the math.
>
> **Purpose:** Answer the question, "at N daily users, will the free tiers hold? And if not, which paid toggle do I flip first, and what does it cost?"
>
> **All numbers are derived from limits in `../03-providers-and-models.md` and the routing decisions in `../04-feature-routing-map.md`.** Cited limits are accurate as of April 2026 — re-verify before launch (the parent doc has direct links to each provider's official limits page).

---

## 1. The headline number

> **At ~50 daily active users with average usage, the free tiers hold comfortably. The first paid toggle to flip is OpenRouter ($10 one-time → 1,000 RPD), and you should do this before launch regardless. After that, free tiers carry you to ~100–150 daily active users before you must enable Gemini billing.**

That's the executive summary. The rest of this doc shows the math.

---

## 2. Inputs to the model

### 2.1 Per-user daily AI calls (assumed)

A typical "active" WiseResume user, in a heavy session, generates roughly:

| Action | Avg calls/session | Feature key | Notes |
|---|---:|---|---|
| Upload + parse a resume | 1 | `resume.parse` | First time only; cache hits afterward. |
| Paste a JD | 1 | `job.parse_text` or `job.parse_url` | |
| Tailor a resume | 1 | `resume.tailor` | Cost-2. |
| Improve 5 bullets | 5 | `bullet.rewrite` | Often more in heavy edit sessions. |
| Generate a cover letter | 1 | `cover_letter.generate` | Cost-2. Premium feature. |
| Chat with the AI assistant | 8 turns | `chat.wise_ai` or `chat.agentic` | Avg conversation length. |
| One interview question bank | 1 | `interview.question_bank` | Cacheable per JD. |
| Misc (analyze, optimize, etc.) | 3 | various | |

**Total: ~21 calls per active session.**

### 2.2 Routing distribution (where those 21 calls land)

Counting per-primary from the feature map:

| Primary provider | Calls per session (typical) | Why |
|---|---:|---|
| Gemini 2.5 Flash | ~6 | Resume parse, JD parse-URL, tailor, analyze, fill-gap, question-bank, etc. |
| Gemini 2.5 Pro | ~1 | Cover letter (premium). |
| Groq Llama 3.3 70B | ~12 | Bullets, chat, JD parse-text, section enhance, interview chat. |
| Groq Llama 3.1 8B | ~1 | Suggest-template, shorten. |
| OpenRouter (free) | ~1 | Recruiter sim or fallback hits. |

This adds to ~21. Slightly fluid because `resume.parse` etc. cache out on repeated use.

---

## 3. Capacity at three target user counts

### 3.1 At **20 daily active users (DAU)** — beta launch

- Total calls/day: 20 × 21 = **420 calls/day**.
- Per provider:

| Provider × model | Calls/day | Free RPD | % of cap |
|---|---:|---:|---:|
| Gemini 2.5 Flash | 120 | 250 | **48%** ✓ |
| Gemini 2.5 Pro | 20 | 100 | **20%** ✓ |
| Groq Llama 3.3 70B | 240 | 1,000 | **24%** ✓ |
| Groq Llama 3.1 8B | 20 | 14,400 | <1% ✓ |
| OpenRouter | 20 | 50 (free) / 1,000 (with $10) | 40% / 2% |

**Verdict:** Comfortable on free tiers. The only borderline number is OpenRouter at 40% — cheap insurance to add the $10 credit.

### 3.2 At **50 DAU** — soft launch

- Total: 50 × 21 = **1,050 calls/day**.

| Provider × model | Calls/day | Free RPD | % of cap |
|---|---:|---:|---:|
| Gemini 2.5 Flash | 300 | 250 | **120% — OVER** ⚠ |
| Gemini 2.5 Pro | 50 | 100 | **50%** ✓ |
| Groq Llama 3.3 70B | 600 | 1,000 | **60%** ✓ |
| Groq Llama 3.1 8B | 50 | 14,400 | <1% ✓ |
| OpenRouter | 50 (baseline) + spillover from Gemini Flash | 1,000 (with $10) | ~10% |

**Verdict:** Gemini Flash is over its free RPD. The auto-throttle (Phase 5) routes excess Gemini Flash calls to fallbacks (OpenRouter → Groq). OpenRouter absorbs the overflow comfortably **only if you've added the $10 credit**.

**Action:** Add the $10 OpenRouter credit before crossing 30 DAU. Don't enable Gemini billing yet — the fallback fills the gap.

### 3.3 At **100 DAU** — public launch

- Total: 100 × 21 = **2,100 calls/day**.

| Provider × model | Calls/day | Free RPD | % of cap |
|---|---:|---:|---:|
| Gemini 2.5 Flash | 600 | 250 | **240% — heavily over** ⚠⚠ |
| Gemini 2.5 Pro | 100 | 100 | **100% — exactly at cap** ⚠ |
| Groq Llama 3.3 70B | 1,200 | 1,000 | **120% — over** ⚠ |
| Groq Llama 3.1 8B | 100 | 14,400 | <1% ✓ |
| OpenRouter | 100 + heavy spillover (~600) | 1,000 (with $10) | **70%** ⚠ |

**Verdict:** Free tiers no longer hold. **Two paid toggles needed:**

1. **Enable Gemini billing** (highest impact). Free → paid jumps Flash RPD from 250 to ~1,000,000 (effectively unlimited for our scale). Pro RPD jumps from 100 to ~10,000. **Estimated cost at 100 DAU:** ~$15–30/month at current Gemini pricing for Flash usage; ~$5–10/month for Pro usage.
2. **Enable Groq billing.** Adds a credit card; daily caps scale up. Cost: pay-as-you-go, expected ~$10–20/month at 100 DAU.

**Total estimated AI infrastructure cost at 100 DAU: ~$30–60/month.** That's roughly **$0.30–$0.60 per DAU per month**, or about $0.01–$0.02 per user per session.

---

## 4. The order of paid upgrades (cheapest first, biggest impact)

Trigger conditions and order of upgrade:

| Order | Action | Trigger | Cost | Effect |
|---|---|---|---|---|
| 1 | **OpenRouter $10 credit** (one-time) | Always — do this before launch | $10 (one-time, sits as balance) | Free RPD: 50 → 1,000. The single biggest "you'd be silly not to" win. |
| 2 | **Enable Gemini billing** on the GCP project | When `gemini-2.5-flash` is at >70% of 250 RPD on most days | ~$15–30/mo at 100 DAU | Frees up Flash + Pro caps. Also disables training-on-prompts (privacy bonus, see doc 06). |
| 3 | **Enable Groq billing** | When `llama-3.3-70b-versatile` is at >70% of 1,000 RPD on most days | ~$10–20/mo at 100 DAU | Scales Groq with you. |
| 4 | **Add OpenRouter credit beyond the $10** | Only if you start using paid OpenRouter models | Pay-as-you-go | We don't currently route to paid models; this is hypothetical. |

> **Critical:** Routing config does **not** change when you flip these. Only the **declared limits** in `../03-providers-and-models.md` (and the mirrored `PROVIDER_LIMITS` constant in `aiRouting.ts`) get bumped. See runbook I in `02-operational-runbooks.md`.

---

## 5. The cost-per-feature view (how to think about pricing)

Each feature has a `creditCost` (1 or 2) that maps to user-facing AI credits. The provider-side cost in dollars is roughly proportional to **tokens × per-token price**.

Rough per-call dollar costs **at paid tier** (Gemini paid pricing as of April 2026):

| Feature | Avg tokens (in + out) | ~$ per call (Gemini Flash) | ~$ per call (Gemini Pro) | ~$ per call (Groq paid) |
|---|---:|---:|---:|---:|
| `resume.parse` (long PDF) | 8,000 + 2,000 | $0.005 | $0.05 | n/a (fallback only) |
| `bullet.rewrite` | 200 + 150 | $0.0002 | $0.002 | $0.0001 |
| `cover_letter.generate` | 2,500 + 800 | $0.002 | $0.02 | $0.0008 |
| `interview.chat_turn` | 800 + 300 | $0.0006 | $0.005 | $0.0003 |
| `wisehire.bulk_screen` | 5,000 + 500 | $0.003 | $0.03 | $0.0015 |

Numbers are rough. Real bills vary ±50% depending on input lengths.

**Implication:** the cover letter feature uses the most-expensive model (Gemini Pro) but is rate-limited by being a deliberate user action (not on every keystroke). The bullet rewrite feature is called dozens of times per session but uses cheap, fast models. The mix is well-balanced.

---

## 6. Where caching saves you the most

From `../04-feature-routing-map.md`, the cacheable features are:

| Feature | Cache TTL | Estimated cache hit rate at scale | Cost saved |
|---|---|---:|---|
| `resume.parse` | 24 h | 30–40% (users re-parse same file) | 30% off the most expensive parsing call |
| `linkedin.parse` | 24 h | 30–40% | Same |
| `job.parse_text` | 7 d | 50–60% (popular JDs reused across users *only via per-user scope*) | Significant in practice |
| `job.parse_url` | 7 d | 60–70% (cross-user scope — same URL across users) | Highest savings here |
| `interview.question_bank` | 24 h | 40–50% | Avoids regenerating the same Q-set per JD |
| `interview.company_briefing` | 7 d | 70%+ (cross-user — same company) | Huge savings — popular companies briefed many times |
| `wisehire.bulk_screen` | 24 h, per-tenant | 20–30% | Recruiters often re-screen the same candidate |
| `wisehire.mask_cvs` | forever, per-tenant | 80%+ | Re-masking the same CV is a no-op |
| `resume.suggest_template` | 24 h | 50%+ | Lightweight |

**Aggregate effect:** at 100 DAU, caching realistically reduces total provider calls by **15–25%**, which translates to roughly **$5–15/month** in saved provider costs. The caching layer pays for itself in operational simplicity even before the dollar savings.

---

## 7. What about $0 — staying purely on free tiers

If you absolutely don't want to pay anything (not even the $10 OpenRouter):

- **Maximum sustainable load: ~15 DAU.** Beyond that, OpenRouter's free 50 RPD becomes the bottleneck because it's the universal fallback.
- **You'll see** higher fallback rates and occasional "all providers exhausted" errors during the late-day UTC hours.
- **Recommendation:** spend the $10. It's a gate, not a recurring cost. The free models stay free after.

---

## 8. Practical thresholds the dashboard will warn you about

These are the gauge thresholds (per `../03-providers-and-models.md` and `../08-admin-dashboard-spec.md`):

| Gauge color | Triggered at | What happens |
|---|---|---|
| Green | <70% of daily limit | Normal operation. |
| Amber | 70–90% | Manual investigation recommended. |
| Red | >90% | Auto-throttle kicks in: non-critical features prefer fallbacks for the rest of the day. |

If you wake up to a "red" gauge consistently for 3 days in a row on the same model, that's the signal to enable paid billing on that provider (use runbook A or follow doc 01 to flip the toggle).

---

## 9. Sanity check — when these numbers are wrong

This entire doc is a model. It will be wrong. Specifically, watch for:

- **Per-user calls/session is empirical.** Once you have a week of `ai_usage_logs` data, replace section 2.1 with the actual mean from production. The query is in `../08-admin-dashboard-spec.md` ("avg calls per active user").
- **Token sizes vary.** Long resumes (many bullets, multiple jobs) use 3–5x more tokens than short ones. Cost-per-call estimates in section 5 assume average-length inputs.
- **Provider pricing changes.** Gemini, Groq, and OpenRouter all repriced at least once in 2025. Check current pricing pages quarterly.
- **Free-tier limits change too.** Gemini bumped Flash RPD from 200 → 250 in late 2025. Numbers in `../03-providers-and-models.md` are dated; re-verify before launch.

After the first month of production data, this doc gets a refresh based on real numbers.
