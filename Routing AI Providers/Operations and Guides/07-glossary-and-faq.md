# 07 — Glossary & FAQ

> **Audience:** You (non-technical). Read this first if any other doc confuses you.
>
> **Purpose:** Plain-language definitions of every term used in the routing project, plus answers to the questions you're most likely to have.

---

## Glossary

### A — F

**AI provider** — A company that runs the actual AI models we send our users' requests to. We use three: **Google Gemini**, **Groq**, and **OpenRouter**. Each one charges (or rate-limits) us per request.

**API key** — A long, secret password we send with every request to a provider so they know it's us and can bill / rate-limit us correctly. We have one key per provider, stored as a Replit Secret.

**BYOK (Bring Your Own Key)** — A feature where the *user* provides their own API key (e.g. their own OpenAI key) and the WiseResume backend uses it for their requests. This bills the user's own provider account, not ours. We have BYOK support for nine providers already; the routing project doesn't change this.

**Cache / Caching** — A short-term storage of AI responses, keyed by the input. If two users (or one user twice) ask for the same thing, we return the stored answer instead of calling the AI provider again. Saves quota and money. Each cacheable feature has rules about who can share a cache entry — see "Cache scope" below.

**Cache scope** — The rule for who is allowed to share a cache entry:

- **Per-user**: only the same user can hit their own cache entry.
- **Per-tenant**: people in the same recruiter organization can share an entry.
- **Cross-user**: anyone can share — used only for inputs that are clearly public (a job-posting URL, a company name).

**Credit** — A unit of internal accounting. Each AI feature costs 1 or 2 credits. Each user has a daily credit limit (5 for free, 100 for pro, unlimited for premium). Cost-2 features (like cover letters and full resume tailoring) take more from the same daily bucket.

**DAU (Daily Active Users)** — Number of distinct users who used the product on a given day. Capacity planning in doc 05 is denominated in DAU.

**DevKit** — The admin-only section of the WiseResume app, gated by an admin email allowlist and a password. The new "AI Activity" dashboard lives there.

**Edge function** — A small piece of backend code that runs on Supabase's serverless platform. WiseResume has ~30 of these for AI features (e.g. `parse-resume`, `enhance-section`, `generate-cover-letter`). They live in `supabase/functions/<name>/index.ts`.

### F — P

**Fallback / Fallback chain** — When the *primary* AI provider for a feature fails (down, rate-limited, errored), the routing system automatically retries with the *second* provider, then the *third*. The list of providers in priority order is the "fallback chain." Every feature in our system has at least 2 providers in its chain.

**Feature key** — A short string that identifies one AI feature, like `resume.parse` or `bullet.rewrite`. The routing config maps each feature key to its primary provider, fallback chain, streaming setting, and cache settings. The feature key is the only thing edge functions need to specify — the routing layer knows everything else.

**Free tier** — The capacity each provider gives you for free, with no credit card. Each has daily caps (e.g. Gemini 2.5 Flash = 250 requests/day on free).

**Managed provider** — A provider where WiseResume holds the API key (we pay/use the quota). The opposite is BYOK, where the user holds the key. Our three managed providers are Gemini, Groq, OpenRouter.

**Model** — A specific AI brain provided by a provider. Each provider offers multiple models with different quality, speed, and cost characteristics. Examples: `gemini-2.5-flash`, `llama-3.3-70b-versatile`, `deepseek/deepseek-chat-v3.1:free`. The routing config picks one model per feature.

**Phase** — A numbered chunk of the implementation plan in `../05-implementation-plan.md`. Phases 0–8. Each is independently reversible (see runbook G in doc 02).

**Primary** — The first provider tried for a given feature. If it works, the call ends there. If it fails, the fallbacks are tried.

**Provider chain** — Same as "fallback chain" — the ordered list of providers for one feature.

### Q — Z

**RPD / RPM** — Requests Per Day / Requests Per Minute. The two main rate-limit dimensions providers use. Free tiers are usually limited by RPD (e.g. Gemini Flash: 250 RPD).

**Routing / Routing config** — The decision-making layer that, given a feature key, knows which provider+model to call first, what fallbacks to try, whether to stream, whether to cache. The single source of truth lives in the file `aiRouting.ts` (which mirrors `../04-feature-routing-map.md` exactly).

**Schema migration** — A change to the database structure (e.g. adding a column). We add a few columns to `ai_usage_logs` and a couple of new tables (`ai_provider_status`, `ai_cache`) in Phase 2. None of these break existing rows.

**Secret** — A sensitive value stored separately from the code, accessed by the backend at runtime. API keys are secrets. Replit has a built-in Secrets manager — that's where the three provider keys live.

**SSE (Server-Sent Events)** — The web protocol used to stream incremental responses from server to client. When the user sees the AI reply "type itself out" word-by-word, that's SSE under the hood. Used by features marked `streaming: true`.

**Streaming** — Sending the AI response to the user as it's being generated, token by token, rather than waiting for the whole thing and sending it at once. Improves perceived speed for chat and long generations. Not all features stream — for short or non-interactive features, one-shot is fine.

**Token** — The unit AI providers count for billing and rate limits. A token is roughly ¾ of a word (English). A typical resume is ~3,000–6,000 tokens. Important because daily caps are sometimes in tokens (TPD = Tokens Per Day) rather than requests.

**TPD / TPM** — Tokens Per Day / Tokens Per Minute. The other rate-limit dimension. Mostly relevant for high-volume features like resume parsing.

**TTL (Time To Live)** — How long a cache entry stays valid. After TTL expires, the entry is treated as if it doesn't exist. Cacheable features each have their own TTL, ranging from 24 hours (resume parse) to 7 days (company briefing) to forever (CV anonymization).

---

## Frequently asked questions

### About the project

**Q: Why are we doing this project at all?**

A: Today, every one of the ~30 AI features in WiseResume picks its own provider and model in code, scattered across the codebase. There's no single place to say "the cover letter feature should use Gemini's premium model with a Groq fallback." This makes it hard to optimize cost, hard to add new providers, hard to see what's happening in production. The routing project consolidates all those decisions into one config file and one dashboard.

**Q: Will users notice anything change?**

A: Ideally, no — except things get faster (streaming for chat) and more reliable (when one provider is down, fallbacks kick in automatically). The user-visible features don't change.

**Q: What's the timeline?**

A: 9 phases (0 through 8) in `../05-implementation-plan.md`. Each phase is small and reversible. No phase changes user-visible behavior in a breaking way. We don't have calendar dates yet — that's set when you say "go".

**Q: What's the risk?**

A: Each phase is designed to be small and reversible. The biggest risk is migrating individual edge functions in Phase 4 — that's why doc 03 in this folder is so detailed and why migrations are done **one at a time**, not in batches.

### About cost and providers

**Q: Will this cost me money?**

A: One-time $10 to OpenRouter (strongly recommended before launch). After that, free tiers carry you to about 50–100 daily users. Beyond that, expected ~$30–60/month at 100 daily users. See `05-cost-and-capacity-model.md` for the full breakdown.

**Q: What if Gemini disappears tomorrow?**

A: Every feature has at least one alternative provider. You'd see a temporary degradation in quality (Gemini's the strongest at long-context tasks) but no outage. You'd update the routing config to skip Gemini until they're back.

**Q: Why three providers and not five or ten?**

A: Each provider has setup, credentials, monitoring, and ongoing maintenance overhead. Three is enough to have meaningful redundancy without becoming a part-time job to manage. If a fourth becomes compelling (e.g. Anthropic adds a free tier), it can be added later — the routing layer is designed for that.

**Q: Can I add a new AI feature later?**

A: Yes. Runbook H in doc 02 describes the exact steps. The short version: pick a feature key, decide its routing in `04-feature-routing-map.md`, add the entry to the config file, write the edge function calling `callAIForFeature()`. The dashboard picks it up automatically.

### About privacy

**Q: Are my users' resumes being used to train AI models?**

A: Possibly, on the free tier of Gemini. Not on Groq. Possibly, via OpenRouter's underlying providers. The full answer is in `06-privacy-and-compliance.md`. The simple answer: tell users honestly in your privacy policy (template wording in doc 06), and enable Gemini paid billing as you grow — that turns off training-on-data for the largest provider.

**Q: Are you storing every prompt and AI response?**

A: No. Only metadata (which feature, how many tokens, how long). Cached responses are stored only for cacheable features, and they're scoped (per-user, per-tenant, or only for clearly-public inputs).

**Q: Can a user delete their AI data?**

A: Yes. Two SQL queries (in runbook E.4 of doc 02) wipe all their metadata and cache entries. This is a manual procedure today — codifying it as an automated request handler is a future task.

### About the dashboard

**Q: Where do I see all the metrics?**

A: DevKit → "AI Activity" tab. The full spec is `../08-admin-dashboard-spec.md`.

**Q: Are the dashboard numbers exact, or estimates?**

A: Exact. Every value is a `count(*)`, `sum(...)`, or `avg(...)` over the actual `ai_usage_logs` table. No projections, no extrapolations. Doc 08 in the parent folder is explicit about this guarantee.

**Q: How fresh are the numbers?**

A: For "Today", auto-refreshes every 60 seconds. For older time ranges, static until you click Refresh.

**Q: What happens when a chart doesn't have data yet?**

A: It shows an empty state ("no calls in this range yet"), not zeros. Distinguishing "zero" from "no data" matters for accurate decisions.

### About operations

**Q: A provider just went down — what do I do?**

A: Runbook B in doc 02. Short version: confirm it on their status page, set the kill switch in `aiRouting.ts`, redeploy. Users see no impact because the fallbacks take over.

**Q: I accidentally pasted my API key in a public Slack channel — what now?**

A: Runbook A in doc 02. Generate a new key in the provider's console, update Replit Secrets, restart workflow, then delete the old key from the provider's console. Total time: about 5 minutes per provider.

**Q: The dashboard shows a red gauge — am I in trouble?**

A: Not immediately. Red means "approaching daily limit, auto-throttle has engaged, fallbacks are absorbing the overflow." Users still get answers. The action is to either enable paid billing on that provider (runbook I in doc 02) or wait for UTC midnight when the daily counter resets.

**Q: I want to disable the cover letter feature for an hour because of a bug — can I?**

A: Yes. Runbook D in doc 02. Add `disabled: true` to that feature's route entry, redeploy. Users see a friendly "this feature is temporarily unavailable" message.

### About the implementation

**Q: Can I have a different AI agent implement this?**

A: Yes — that's exactly what these docs are designed to enable. Hand them the parent folder + this folder. The most important docs for an implementing agent are:

1. `../05-implementation-plan.md` — the phased plan.
2. `../09-decisions-log.md` — the locked product decisions.
3. `03-edge-function-migration-checklist.md` (this folder) — the per-function migration template.
4. `04-test-plan.md` (this folder) — what to verify after each phase.

The agent should treat the parent docs as the spec and these docs as the operational manual.

**Q: What if the implementing agent wants to deviate from the plan?**

A: They should write a new entry in `../09-decisions-log.md` proposing the change with rationale, get your approval, and then update both `../04-feature-routing-map.md` and any affected docs in this folder before changing code. Plan-first is the rule throughout.

**Q: I changed my mind about a routing decision — what do I update?**

A: In order:

1. Edit the row in `../04-feature-routing-map.md`.
2. Edit `aiRouting.ts` to match.
3. Re-deploy affected edge functions.
4. Verify on the dashboard.

The map is the authority. Code mirrors the map, never the other way around.

---

## Where to go next

- If you want **hands-on, do-it-now**: doc 01 in this folder (sign up for the three providers).
- If you want **what-could-go-wrong**: doc 02 (runbooks) and `../10-risks-and-rollback.md` (parent folder).
- If you want **the big technical picture**: `../README.md` (parent folder), then read it in order.
- If you want **the policy and decisions in one place**: `../09-decisions-log.md`.

Welcome to the project. Everything is documented; nothing is mysterious.
