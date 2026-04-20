# OpenRouter 2 Managed Provider — Deployment Runbook

This document captures how the OpenRouter 2 managed provider (Task #13 / #14)
is deployed to Supabase and how to re-verify it. The routing code itself
lives in `supabase/functions/_shared/aiClient.ts`; this file exists so the
deployment + verification steps are codified rather than tribal knowledge.

## What is "OpenRouter 2"

A second OpenRouter managed account, pinned to model
`openrouter/elephant-alpha`. The slug constant lives in
`src/lib/aiDefaults.ts` (`OPENROUTER2_DEFAULT_MODEL`) and is mirrored in
`aiClient.ts`. Selecting it as the WiseResume sub-provider routes calls
through `OPENROUTER2_API_KEY` instead of the primary `OPENROUTER_API_KEY`.

Auto-mode fallback order: `openrouter` → `openrouter2` → `groq`.

## Required environment

Supabase Edge Functions (`project_ref = jnsfmkzgxsviuthaqlyy`) must have:

| Secret                | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `OPENROUTER2_API_KEY` | Server-side key for the secondary OR account.   |

The key must never be committed, logged, or returned to the client. Only
the edge functions read it.

## Deploying the routing code

The new routing branch is consumed by every edge function that imports
`_shared/aiClient.ts` (currently 34 functions). After any change to
`aiClient.ts` or the OpenRouter 2 path, redeploy them.

```bash
supabase link --project-ref jnsfmkzgxsviuthaqlyy

# All functions that import aiClient.ts:
supabase functions deploy \
  ai-test ai-health agentic-chat analyze-resume ask-portfolio \
  career-assessment career-path-advisor company-briefing \
  detect-and-humanize enhance-section explain-gap fill-gap \
  generate-cover-letter generate-headshot generate-portfolio-bio \
  generate-question-bank generate-resignation-letter interview-chat \
  one-page-optimizer optimize-for-linkedin parse-job-text parse-job-url \
  parse-linkedin parse-resume recruiter-simulation score-resume \
  suggest-template tailor-resume tailor-section wise-ai-chat \
  wisehire-bulk-screen wisehire-generate-brief wisehire-mask-cvs \
  wisehire-write-jd \
  --project-ref jnsfmkzgxsviuthaqlyy
```

Batches of ~8 functions at a time fit comfortably inside a 2-minute
deploy window.

## Setting / rotating the secret

```bash
supabase secrets set OPENROUTER2_API_KEY=<rotated-key> \
  --project-ref jnsfmkzgxsviuthaqlyy
supabase secrets list --project-ref jnsfmkzgxsviuthaqlyy | grep OPENROUTER2
```

The CLI prints a SHA-256 of each secret value. To confirm the deployed
secret matches a key in hand:

```bash
echo -n "$OPENROUTER2_API_KEY" | sha256sum
```

Compare the hex against the value shown by `supabase secrets list`.

## Verification steps

1. **Upstream sanity check.** Confirms the rotated key is valid for the
   pinned model. Does not touch Supabase.

   ```bash
   curl -sS -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer $OPENROUTER2_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"openrouter/elephant-alpha",
          "messages":[{"role":"user","content":"Reply with the single word: pong"}],
          "max_tokens":10}'
   ```

   Expected: HTTP 200 and `choices[0].message.content == "pong"`.

   If OpenRouter rejects the model id, **report the error to the admin**.
   Do not substitute a different model — the pin is the whole point of
   the secondary account.

2. **DevKit "Test connection" (admin UI).** Open the DevKit AI Provider
   panel, switch to the **OpenRouter 2** tab, and click **Test**. Expected:
   a green `<latencyMs>ms · openrouter/elephant-alpha` result. The button
   sends `wiseresumeSubProvider: 'openrouter2'` to
   `supabase/functions/ai-test/index.ts`, which is admin-gated.

3. **End-to-end across AI surfaces.** Set the global engine to
   `openrouter2` in `app_settings.wiseresume_ai_engine` (DevKit panel
   does this) and exercise one call from each:
   - Resume tailoring (`tailor-resume`)
   - Cover letter (`generate-cover-letter`)
   - Interview prep (`generate-question-bank` / `interview-chat`)
   - AI chat (`wise-ai-chat` or `agentic-chat`)

   Expected: each response carries `providerUsed`
   `wiseresume/openrouter2:openrouter/elephant-alpha`.

4. **Auto-mode fallback.** Switch the engine back to `auto`. Confirm in
   logs that the chain still tries `openrouter → openrouter2 → groq` and
   that all three providers are reachable.

## Notes

- BYOK paths (per-user OpenRouter / Gemini / Ollama / OpenAI / Anthropic
  / Groq / Mistral / xAI / Cohere keys) are unaffected by OpenRouter 2.
  They never use `OPENROUTER2_API_KEY`.
- The shared circuit breaker key for this step is
  `wiseresume/openrouter2`. If the breaker opens, subsequent calls fail
  fast for `BREAKER_COOLDOWN_SECONDS` (default 60s) before a single
  half-open probe is allowed through.
- Any plaintext OpenRouter 2 key that has ever been pasted into chat,
  logs, or screenshots must be rotated on OpenRouter and the new value
  pushed via `supabase secrets set` before being considered live.
