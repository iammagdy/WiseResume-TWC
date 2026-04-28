# 06 — Privacy & Compliance Notes

> **Audience:** You (non-technical). Designed to be readable end-to-end without engineering background.
>
> **Purpose:** Explain — in plain language — what data leaves your platform when an AI feature is used, what each provider's terms say about what they do with that data, and what you should put in your user-facing privacy policy. This is not legal advice, but it's a faithful, accurate summary of the providers' published terms as of April 2026.
>
> **Always re-verify before launch.** Privacy policies change. Direct links to each provider's policy are at the bottom of each section.

---

## The big picture in three sentences

1. When a user uses an AI feature in WiseResume, their input (e.g. resume text, job description, chat message) is sent to one of three AI providers — Gemini, Groq, or OpenRouter — to be processed.
2. **None of these providers train their models on paid-tier data**, but **the free tiers of Gemini and OpenRouter may use prompts for product improvement**. Groq does not.
3. WiseResume itself stores **metadata about each call** (which feature, which provider, how many tokens, how long it took) but **does not store the prompt or response content** by default — that means we can't be subpoenaed for content we don't have, and a database breach doesn't expose user resumes.

That's the safe summary. Details below.

---

## Per-provider data handling

### Google Gemini

**What they get:** The full prompt text (which includes whatever you sent — resume text, JD, chat message), plus any uploaded files for vision features (PDF, image).

**What they say they do with it:**

- **Free tier (what we use today):** Google explicitly states they **may use prompts and outputs to improve their products**, including model training. This is documented at [https://ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms).
- **Paid tier (after enabling billing on the Google Cloud project):** Google **does not** use your data for training. This is documented at [https://cloud.google.com/gemini/docs/discover/data-governance](https://cloud.google.com/gemini/docs/discover/data-governance).
- Logs are retained for **abuse monitoring** in either tier, typically 30–55 days. Logs are not used for training in the paid tier.

**Where data is processed:** Google data centers, region depends on your project setting.

**Our recommendation:**

- For launch, the free tier is acceptable. Decision **D6** in `../09-decisions-log.md` records this choice explicitly ("Privacy posture on the Gemini free tier"). We disclose it to users (see "User-facing privacy disclosure" below).
- **Once you're on paid tier (typically at ~100 DAU per `05-cost-and-capacity-model.md`)**, training is automatically disabled. This is a privacy bonus on top of the capacity bump.

---

### Groq

**What they get:** The prompt text. Groq doesn't have vision features in our routing — text only.

**What they say they do with it:**

- **Groq does not train on customer data** — free tier or paid. This is documented at [https://groq.com/privacy-policy](https://groq.com/privacy-policy).
- Inputs and outputs are retained briefly for operational purposes (typically <30 days).
- They are SOC 2 Type II compliant.

**Where data is processed:** US-based data centers (Groq's only region as of 2026).

**Our take:** Groq is the most privacy-friendly of the three managed providers by default. Anything we route to Groq is the safest from a "this is being trained on" perspective.

---

### OpenRouter

**What they get:** The prompt text. OpenRouter is a router itself — they forward your request to whichever underlying model you picked, plus add their own request logging.

**What they say they do with it:**

- **OpenRouter itself logs requests for billing/abuse**, retained ~30 days. They do not train on data.
- **The underlying provider's policy applies too.** When we route to `deepseek/deepseek-chat-v3.1:free` via OpenRouter, DeepSeek (or whichever inference provider OpenRouter uses for that model) also gets the prompt. Their terms apply on top.
- OpenRouter's own policy: [https://openrouter.ai/privacy](https://openrouter.ai/privacy).
- They publish a "training opt-out" toggle per model in their docs — for the `:free` models we use, opt-out is **not always available** because the inference is provided by partners with their own terms.

**Our take:** OpenRouter is appropriate as a **fallback** path. Treat it as having approximately the same privacy stance as the worst-of-the-underlying-providers it's routing to. For the free `:free` models we use today, assume **inputs may be used to improve the underlying model**.

**Mitigation in routing:** OpenRouter is rarely the primary in `../04-feature-routing-map.md`. It's mostly used as a fallback when Gemini or Groq fail. So at steady state, only a small fraction of traffic goes through it.

---

### BYOK providers (user-supplied keys)

When a user adds their own API key (e.g. their own OpenAI key, Anthropic key, etc.) via the BYOK feature, requests go directly to that provider with that user's key. **WiseResume's managed-provider terms above do not apply** — the user is bound by whatever they agreed to when they got the key.

WiseResume still logs the call **metadata** (feature, tokens, duration) but does not store the prompt content. The provider gets the full prompt under the user's account.

---

## What WiseResume itself stores

This is the part you control. Per `../01-current-state.md` and `../05-implementation-plan.md`:

| What | Stored? | Where | Retention |
|---|---|---|---|
| **Prompt content** (the actual text sent to the AI) | **No** | — | — |
| **Response content** (the actual text returned) | **No, with one exception below** | — | — |
| Call metadata: which feature, which provider, which model, token counts, latency, error_type | Yes | `ai_usage_logs` table | 90 days by default (configurable in the cron job in runbook 02-J of this folder; **no D-decision in `../09-decisions-log.md` locks this number** — set it per your published privacy policy) |
| User ID associated with each call | Yes | `ai_usage_logs.user_id` | Same as above |
| Cached responses for cacheable features | Yes (this is the exception) | `ai_cache` table | TTL per feature (24 h to 7 d typically; "forever" for `wisehire.mask_cvs`) |

### The cache exception, explained

For features marked `cacheable` in `../04-feature-routing-map.md` (`resume.parse`, `linkedin.parse`, `job.parse_*`, `interview.question_bank`, `interview.company_briefing`, `wisehire.bulk_screen`, `wisehire.mask_cvs`, `resume.suggest_template`), the AI's **response** is stored in the `ai_cache` table for the duration of its TTL.

Per `../07-caching-design.md`:

- **Per-user-scoped** caches store the response keyed against the user's ID — only that user can hit it.
- **Per-tenant-scoped** caches (used by WiseHire features) are shared within a recruiter org.
- **Cross-user-scoped** caches are used **only** for inputs that are demonstrably public (a job posting URL, a public company name) — never for resume content.

When a user requests data deletion, runbook E.4 in `02-operational-runbooks.md` shows the exact SQL to wipe their cache entries.

### Why we don't store prompts/responses by default

1. **Privacy.** A breach of `ai_usage_logs` exposes metadata only — not the user's resume or chat history.
2. **Storage cost.** Resume + JD prompts can be 5–10 KB each; at 2,000 calls/day that's 10–20 MB/day, 4–7 GB/year. Metadata is ~200 bytes per row.
3. **Subpoena posture.** "We genuinely do not have this data" is the strongest possible response to a content subpoena.

If a debugging scenario truly requires inspecting prompts, the user is asked to reproduce the issue while the developer watches live logs (per runbook F in `02-operational-runbooks.md`).

---

## What you should disclose to users

The following plain-language disclosure is appropriate for your privacy policy / terms of service. Adapt the wording to match your existing voice — but the substance should be preserved.

> **AI processing of your content**
>
> WiseResume uses third-party AI providers (currently Google Gemini, Groq, and OpenRouter) to power features such as resume parsing, content rewriting, cover letter generation, and chat assistance. When you use these features, the relevant content (e.g. text from your resume, the job description you provided, or your chat messages) is sent to one of these providers for processing.
>
> **Data we send:** Only the content needed to fulfill the specific feature you triggered. We do not send your account password, billing information, or content from features you did not use.
>
> **Data the providers may retain:** Each provider has its own privacy policy. Some providers may retain your inputs for short-term abuse monitoring or product improvement. Specifically:
>
> - **Google Gemini (free tier):** May use your inputs to improve Google's products. We will move to Google's paid tier as we scale, which disables this. See Google's [terms](https://ai.google.dev/gemini-api/terms).
> - **Groq:** Does not train on your inputs in any tier. See Groq's [policy](https://groq.com/privacy-policy).
> - **OpenRouter:** Routes requests to underlying model providers; some may use inputs to improve their models. See [OpenRouter's policy](https://openrouter.ai/privacy).
>
> **What WiseResume stores:** We store metadata about each AI call (which feature, which provider, how long it took) but not the content of your prompts or AI responses, except where caching is needed to make repeat requests faster (e.g. parsing the same resume file twice). Cached entries are scoped to your account or your organization and are deleted after their expiration time (typically 24 hours to 7 days).
>
> **Bring-your-own-key (BYOK):** If you have provided your own API key for an AI provider, your requests go directly to that provider under your account. WiseResume only stores the same metadata described above.
>
> **Your choices:** You can request deletion of your cached AI data at any time by contacting contact@thewise.cloud. You can also use BYOK to send your data only to a provider you have a direct relationship with.

---

## Compliance flags worth knowing

| Concern | Status | Notes |
|---|---|---|
| **GDPR** (EU users) | Compatible | We don't store content; metadata is associated with the user_id. Users can delete their account → cascading delete removes their `ai_usage_logs` rows. Per-user `ai_cache` entries cannot be deleted by SQL filter (the user_id is hashed into `input_hash` per `../07-caching-design.md`); they expire naturally within ≤ 7 days, or the operator can purge a whole feature's cache via runbook E.2 in doc 02. |
| **CCPA** (California users) | Compatible | Same reasoning. The "right to know" request returns metadata only; the "right to delete" cascade is the same. |
| **HIPAA** (health data) | **Not compatible without paid Gemini + a BAA.** | We do not currently support PHI. Free-tier Gemini disqualifies HIPAA coverage by default. If a healthcare workflow is ever added, route it BYOK-only with a HIPAA-compliant Anthropic or OpenAI account, or wait for a Gemini BAA. |
| **SOC 2** | Inherited from infra (Supabase) + Groq is SOC 2 Type II. Gemini and OpenRouter not SOC 2 themselves but their cloud parents are. | Sufficient for a typical SaaS posture, not for enterprise sales without explicit attestation. |
| **Children (COPPA)** | Not applicable; product is 16+. | If product ever onboards minors, AI calls would need parental consent flows. |
| **Training on resume PII** | Mitigated to "free-tier Gemini may, free-tier OpenRouter may, Groq doesn't". | The resume is the user's own data; risk is "model memorizes a snippet". The disclosure above is sufficient for a typical consumer SaaS. Enterprise customers will ask for paid Gemini → enable on demand. |

---

## What changes when you enable paid tiers

This is a one-time set of toggles, not a recurring change:

| Provider | Privacy improvement when paid is enabled |
|---|---|
| Gemini | **Stops using your data for training.** Adds option to choose data region (US, EU). |
| Groq | No change — they didn't train on your data anyway. Paid just bumps capacity. |
| OpenRouter | No change to underlying-provider behavior. You'd need to switch from `:free` model variants to paid ones to get the no-training guarantees of paid OpenAI/Anthropic. We don't currently route to those. |

So the **single most impactful privacy step** post-launch is enabling Gemini billing. It also coincides with the highest-impact capacity step (per `05-cost-and-capacity-model.md`).

---

## Disposal procedures

When a user deletes their account, the following must happen (these belong in your account-deletion code path, not in the AI routing layer per se, but listed here for completeness):

1. `DELETE FROM ai_usage_logs WHERE user_id = '<uuid>'` — removes their call metadata.
2. **Cache cleanup:** per-user `ai_cache` rows cannot be filtered by user_id (the user_id is folded into `input_hash` per `../07-caching-design.md`). They become unreachable the moment the account is deleted (no future request can reproduce the hash) and disappear within ≤ 7 days via TTL expiry. If a regulator demands immediate purge, run `SELECT purge_ai_cache('<feature_key>');` for each per-user-scoped cacheable feature — see runbook E.4 in doc 02 for the rationale.
3. Per-tenant cache rows (WiseHire) are not deleted on individual-user deletion — they belong to the org. They are deleted when the org account is deleted.
4. BYOK keys (`user_api_keys` table) — already covered by the existing user-deletion cascade. The encrypted blob is gone after delete; even if a backup were leaked, the encryption secret rotation would invalidate decryption.

The disposal procedures above are codified in runbook E in `02-operational-runbooks.md`.

---

## What's NOT in scope for this doc

- **Legal review of your final privacy policy.** This doc is a faithful summary of provider terms — but you should still have a lawyer review the final policy you publish to users.
- **Data Processing Agreements (DPAs).** Each provider offers a DPA on request (often required for B2B sales). You sign these directly with the provider; WiseResume is not a party.
- **Cross-border data transfer mechanisms** (Standard Contractual Clauses, etc.). Each provider handles this through their DPA and regional data centers.

---

## Quick decision matrix

| If a user asks… | Tell them… |
|---|---|
| "Is my resume used to train AI models?" | "On the free tier of one of our providers (Gemini), it may be — disclosed in our terms. We move to a no-training paid plan as we grow. The other providers don't train on your data." |
| "Where is my resume stored?" | "Your resume itself is stored in our database. We don't store the AI prompts or responses themselves — we just keep a record of which features you used." |
| "Can you delete my AI history?" | "Yes — request deletion from support and we'll wipe your cached AI responses and call metadata." |
| "Can I bring my own AI key?" | "Yes — settings → AI providers → add your key. Your requests then go directly to your provider." |
| "Are you HIPAA-compliant?" | "Not at this time. We're a general-purpose career tool, not designed for protected health information." |
