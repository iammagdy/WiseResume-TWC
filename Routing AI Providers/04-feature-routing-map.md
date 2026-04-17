# 04 — Feature Routing Map

> **Purpose:** For every AI-powered feature in WiseResume, define the **primary provider+model**, the **fallback chain**, whether it **streams**, whether it's **cacheable**, and the **credit cost**.
>
> This file *is* the policy. The actual `aiRouting.ts` config file (when written) is a 1-to-1 translation of the table below.
>
> **Anything you want to change in routing — change it here first.**

---

## Routing key conventions

- **Feature key format:** `<domain>.<verb>` (lowercase, dot-separated). Examples: `resume.parse`, `bullet.rewrite`, `cover_letter.generate`.
- **Provider IDs:** `gemini` | `groq` | `openrouter`.
- **Model IDs:** exact slugs from `03-providers-and-models.md` (no aliasing). In every cell below, the format is **`provider · <exact slug from 03>`** — the slug is copied verbatim from the `MODELS` constant in 03, never abbreviated.
- **Streaming:** `true` only if the user-perceived latency benefits from incremental rendering (chat, long generations) and the front-end is wired to consume SSE for that feature.
- **Cacheable:** `true` only if the *same input always justifies the same output* AND the cache scope (cross-user or per-user) is defined. Generative + personalized features are never cached. See `07-caching-design.md` for cache scope rules.
- **Credit cost:** integers, deducted from `ai_credits.daily_usage`. Default 1 unless noted.

> **Slug reference (copy-paste from `03-providers-and-models.md`):**
>
> - Gemini: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `text-embedding-004`
> - Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `deepseek-r1-distill-llama-70b`
> - OpenRouter: `deepseek/deepseek-chat-v3.1:free`, `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`

---

## The full map

### Resume parsing & ingestion

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `resume.parse` | `parse-resume` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | **Yes** (24 h, keyed by file SHA) | 1 | Gemini's vision + 1 M-token context handles messy PDFs natively. Cache same file forever. |
| `linkedin.parse` | `parse-linkedin` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | Yes (24 h) | 1 | Same reasoning as above. |
| `job.parse_text` | `parse-job-text` | `groq · llama-3.3-70b-versatile` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `gemini · gemini-2.5-flash` | No | Yes (7 d) | 1 | Plain text; Groq is fast and cheap. JD text is stable, cache it. |
| `job.parse_url` | `parse-job-url` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | Yes (7 d) | 1 | URL pages can be long/structured; Gemini long context wins. |

### Resume editing & enhancement

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `bullet.rewrite` | `enhance-section` (bullet path) | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | **Yes** | No | 1 | Speed felt by user. Streaming makes it feel live. |
| `section.enhance` | `enhance-section` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | Yes | No | 1 | Same. |
| `section.shorten` | `enhance-section` (shorten action) | `groq · llama-3.1-8b-instant` | `groq · llama-3.3-70b-versatile` → `gemini · gemini-2.5-flash-lite` | Yes | No | 1 | Lightweight transform; tiny model is enough. |
| `section.add_metrics` | `enhance-section` (metrics action) | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` | Yes | No | 1 | Quality matters; speed too. |
| `section.fix_error` | `enhance-section` (fix_error) | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` | No | No | 1 | One-shot correction. |
| `resume.tailor` | `tailor-resume` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | **Yes** | No | 2 | Long context (resume + JD); Gemini wins. Heavier op → cost 2. |
| `resume.tailor_section` | `tailor-section` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | Yes | No | 1 | |
| `resume.analyze` | `analyze-resume` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-r1:free` → `groq · llama-3.3-70b-versatile` | No | No | 1 | Structured output; long input. |
| `resume.one_page_optimize` | `one-page-optimizer` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | No | 1 | Needs full resume context. |
| `resume.detect_humanize` | `detect-and-humanize` | `groq · llama-3.3-70b-versatile` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `gemini · gemini-2.5-flash` | Yes | No | 1 | Rewrite speed matters. |
| `resume.recruiter_sim` | `recruiter-simulation` | `openrouter · deepseek/deepseek-r1:free` | `gemini · gemini-2.5-pro` → `groq · llama-3.3-70b-versatile` | No | No | 2 | Reasoning quality matters most. |
| `resume.suggest_template` | `suggest-template` | `groq · llama-3.1-8b-instant` | `gemini · gemini-2.5-flash-lite` | No | Yes (24 h) | 1 | Lightweight classifier. |
| `resume.fill_gap` | `fill-gap` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | Yes | No | 1 | Generates a draft; needs context. |
| `resume.explain_gap` | `explain-gap` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` | Yes | No | 1 | Short generation. |

### Generation (cover letters, resignation, portfolio)

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `cover_letter.generate` | `generate-cover-letter` | `gemini · gemini-2.5-pro` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | **Yes** | No | 2 | Quality matters; user is happy to wait a few seconds. |
| `resignation_letter.generate` | `generate-resignation-letter` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | Yes | No | 1 | Standard format; Flash is enough. |
| `portfolio.generate_bio` | `generate-portfolio-bio` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` | Yes | No | 1 | Short, fast. |
| `linkedin.optimize` | `optimize-for-linkedin` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | Yes | No | 1 | |

### Interview & career

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `interview.question_bank` | `generate-question-bank` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | Yes (24 h, keyed by JD hash) | 1 | Same JD → same questions; cache it. |
| `interview.chat_turn` | `interview-chat` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | **Yes** | No | 1 | Conversational speed is critical. |
| `interview.company_briefing` | `company-briefing` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | Yes (7 d, keyed by company name) | 1 | Same company → same briefing for a week. |
| `career.assessment` | `career-assessment` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | No | No | 1 | Personalized; not cacheable. |
| `career.path_advisor` | `career-path-advisor` | `gemini · gemini-2.5-pro` | `openrouter · deepseek/deepseek-r1:free` → `groq · llama-3.3-70b-versatile` | Yes | No | 2 | Reasoning quality matters. |

### Chat assistants

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `chat.agentic` | `agentic-chat` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | **Yes** | No | 1 | Editor assistant; speed + streaming = good UX. |
| `chat.wise_ai` | `wise-ai-chat` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | **Yes** | No | 1 | Dashboard assistant. |
| `chat.portfolio_visitor` | `ask-portfolio` | **BYOK-only — excluded from managed routing** | — | — | — | — | Owner-supplied key. Not registered in `FEATURE_ROUTES` and explicitly skipped by the Phase 1 "every feature has ≥1 fallback" validator. Streaming behavior is owned by `ask-portfolio` independently. |

### WiseHire (recruiter suite)

| Feature key | Edge fn today | Primary | Fallback chain | Stream | Cache | Cost | Why |
|---|---|---|---|---|---|---|---|
| `wisehire.write_jd` | `wisehire-write-jd` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | Yes | No | 1 | |
| `wisehire.generate_brief` | `wisehire-generate-brief` | `gemini · gemini-2.5-flash` | `openrouter · deepseek/deepseek-chat-v3.1:free` → `groq · llama-3.3-70b-versatile` | No | No | 1 | |
| `wisehire.bulk_screen` | `wisehire-bulk-screen` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` → `openrouter · deepseek/deepseek-chat-v3.1:free` | No | Yes (24 h, per-CV hash) | 1 | Same CV vs same JD → same screen. |
| `wisehire.mask_cvs` | `wisehire-mask-cvs` | `groq · llama-3.3-70b-versatile` | `gemini · gemini-2.5-flash` | No | Yes (forever, per-CV hash) | 1 | Anonymization is deterministic. |

---

## Routing decisions, summarized as principles

The table above isn't arbitrary. Every assignment follows these rules:

1. **Speed-critical and short → Groq** (chat, bullet rewrites, autocomplete-like suggestions).
2. **Long context, vision, or "best quality general" → Gemini Flash** (parsing, tailoring, JD work).
3. **Reasoning-heavy or "premium output" → Gemini Pro** primary, with OpenRouter DeepSeek R1 as the rationality-equivalent fallback.
4. **Catalog/safety net → OpenRouter** appears in nearly every fallback chain because it has the most diverse free models and dynamic discovery already built into `aiClient.ts`.
5. **Every chain has at least 2 providers.** No feature dies if any single provider is fully down.
6. **Cost-2 features are reserved for heavy/long ops** (full resume tailoring, cover letter generation, recruiter sim, career path advisor). Everything else is cost-1.

---

## How this maps into code (preview, not yet written)

When the routing config is built, this table becomes:

```ts
// supabase/functions/_shared/aiRouting.ts (planned)
export const FEATURE_ROUTES: Record<FeatureKey, FeatureRoute> = {
  'resume.parse': {
    primary:  { provider: 'gemini',     model: MODELS.gemini.flash },
    fallbacks:[
      { provider: 'openrouter', model: MODELS.openrouter.chat },
      { provider: 'groq',       model: MODELS.groq.llama70b },
    ],
    streaming: false,
    cache:     { enabled: true, ttlSeconds: 86_400, keyParts: ['fileSha'] },
    creditCost: 1,
  },
  'bullet.rewrite': { /* ... */ },
  // ... one entry per row above
};
```

Edge functions then look like:

```ts
// inside enhance-section/index.ts (after migration)
const result = await callAIForFeature({
  featureKey: 'bullet.rewrite',
  messages,
  userId,
});
```

No model strings, no provider names. Just the feature key.

---

## Changing the map

Three rules:

1. **Edit this file first.** Get the policy right in plain English/Markdown.
2. **Then update `aiRouting.ts`** to match.
3. **Then re-deploy the affected edge functions** (no schema changes needed because all model selection is server-side).

Never edit `aiRouting.ts` without a corresponding edit here. The dashboard pulls feature names from this map; drift between the two will mislead operators.
