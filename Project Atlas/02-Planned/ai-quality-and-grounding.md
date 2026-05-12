# AI Quality and Grounding

**Status:** Planned improvement track
**Atlas role:** Durable summary of the useful findings from the former external AI tools audit. The old audit was removed because Atlas is now the only documentation source of truth.

## Current Understanding

WiseResume and WiseHire rely on Appwrite-first application architecture, with AI calls routed through the current AI gateway/function layer. Any implementation work must verify the live code before acting because older documentation referenced Supabase edge functions and old provider defaults.

## Durable Findings to Preserve

- AI writing quality depends heavily on provider/model routing. Avoid assuming a default model is good enough for paid or high-value user workflows.
- Company and market research features need real grounding/search or explicit source links. A model-only prompt cannot reliably produce fresh company data, funding news, layoffs, current executives, or market facts.
- Prompt instructions are not enough. Important quality rules need post-generation validation where possible, especially for resume bullets, banned generic openers, unsupported claims, and missing metrics.
- Profile context should be reused across writing tools so output matches the user's seniority, industry, and target role instead of sounding generic.
- Temperatures for resume and hiring content should usually be conservative. Deterministic writing and scoring flows should prefer lower-variance settings unless a feature explicitly needs creative exploration.
- Scoring must avoid multiple unexplained sources of truth. If deterministic scoring and AI analysis both exist, the user-facing UI should explain how they relate or combine them into one clear interpretation.
- Cached or logged AI data must respect privacy. Do not store prompts, resumes, candidate data, or responses unless the product deliberately needs it and Atlas documents the retention rule.

## Priority Backlog

1. Route paid/high-value writing tools to stronger models or provider tiers after verifying the current gateway configuration.
2. Add grounded search with source URLs to company briefing and any market-fresh features.
3. Add validators for resume enhancement output quality.
4. Inject profile/seniority context into all relevant writing flows.
5. Align visible ATS/AI score displays so users are not shown contradictory numbers without explanation.

## Agent Rule

Before changing any AI behavior, inspect the live AI gateway/functions and current Appwrite integration. Treat this file as direction, not proof of current implementation details.
