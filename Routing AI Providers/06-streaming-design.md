# 06 — Streaming Design

> **Purpose:** Spell out exactly how streaming responses work end-to-end across the three providers, the edge function layer, and the React front-end. This is the part of the plan most likely to bite if rushed, so it gets its own doc.

---

## What "streaming" means here

The user sees the AI's response **appear word-by-word as it's generated**, instead of waiting for the full reply and seeing it dump in one shot. For chat-like features and long generations (cover letter, full resume tailoring), this is the difference between "feels instant" and "feels broken".

We use **Server-Sent Events (SSE)** as the wire protocol — a one-way stream of `text/event-stream` frames from the server to the browser. SSE is the industry standard for LLM streaming, works through Supabase edge functions, works on mobile via Capacitor, and degrades gracefully (the browser auto-reconnects).

We are **not** using WebSockets — there's no need for client-to-server streaming in this use case.

---

## Protocol — what the edge function returns

When the front-end sends `Accept: text/event-stream`, the edge function returns:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no                 ← prevents proxy buffering
```

Followed by a sequence of SSE events, each ending with `\n\n`:

```
event: meta
data: {"provider":"groq","model":"llama-3.3-70b-versatile","cache_hit":false}

event: token
data: {"delta":"Lead"}

event: token
data: {"delta":"ing"}

event: token
data: {"delta":" the team"}

…

event: usage
data: {"prompt_tokens":412,"completion_tokens":180,"latency_ms":380}

event: done
data: {}
```

If the primary provider fails mid-stream and the chain falls back, the front-end receives:

```
event: token
data: {"delta":"Lead"}

event: provider-change
data: {"reason":"primary_429","new_provider":"openrouter","new_model":"deepseek/deepseek-chat-v3.1:free"}

event: token
data: {"delta":"Leading the team..."}    ← restarted from scratch
```

The front-end **clears the partial buffer** on `event: provider-change`. The user sees a brief flicker where the text restarts; the alternative (concatenating partial output from two different models) produces incoherent output and is worse UX. (This is a deliberate design choice; see "Trade-offs" below.)

If the entire chain fails:

```
event: error
data: {"code":"ai.all_providers_unavailable","retry_after_seconds":1800}
```

Followed by closing the stream. The front-end maps `code` to the friendly toast.

---

## Per-provider streaming notes

### Groq
- **Endpoint:** `POST /openai/v1/chat/completions`
- **Streaming:** OpenAI-compatible. Set `stream: true` in the body.
- **Wire format:** `data: {...}\n\n` chunks ending with `data: [DONE]\n\n`.
- **Edge function adapter:** trivial — read chunks, parse JSON, extract `choices[0].delta.content`, re-emit as our `event: token`.

### OpenRouter
- **Endpoint:** `POST /api/v1/chat/completions`
- **Streaming:** OpenAI-compatible (same as Groq).
- **Edge function adapter:** identical to Groq.
- **Quirk:** OpenRouter occasionally inserts `: OPENROUTER PROCESSING\n\n` heartbeat comments — must be skipped (already handled in standard SSE parsers).

### Gemini
- **Endpoint:** `POST /v1beta/models/<model>:streamGenerateContent`
- **Streaming:** Gemini-native — returns chunked JSON arrays, **not** OpenAI-compatible SSE.
- **Wire format:** chunks of `[{ candidates: [{ content: { parts: [{ text: "..." }] } }] }]`.
- **Edge function adapter:** parse the streaming JSON, extract `candidates[0].content.parts[0].text`, re-emit as our `event: token`.
- **Token usage:** Gemini emits the final `usageMetadata` object only after the stream ends. We capture it in our `event: usage` frame.

In all three cases, the *user-facing* protocol is identical SSE — the differences are absorbed by per-provider adapter functions inside `aiClient.ts`.

---

## Edge function pattern (planned shape)

```ts
// inside e.g. enhance-section/index.ts (after Phase 5 migration)
const wantsStream = req.headers.get('accept') === 'text/event-stream';

if (wantsStream) {
  const stream = await callAIForFeatureStream({
    featureKey: 'bullet.rewrite',
    messages,
    userId,
  });
  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// existing one-shot path unchanged
const result = await callAIForFeature({ featureKey: 'bullet.rewrite', messages, userId });
return jsonResponse(result, corsHeaders);
```

---

## Front-end pattern (planned)

A new hook `useAIStream(featureKey, payload)` lives in `src/hooks/`. It:

1. Opens `fetch(edgeFnUrl, { method: 'POST', body, headers: { Accept: 'text/event-stream', Authorization: 'Bearer ...' } })`.
2. Reads `response.body!.getReader()` chunks.
3. Parses SSE frames (boundary = `\n\n`).
4. For each frame, dispatches to an `onEvent({ type, data })` callback.
5. Exposes `{ text, isStreaming, isDone, error, cancel() }` to React components.

Why `fetch` + `getReader()` instead of `EventSource`?
- `EventSource` doesn't allow setting custom headers (we need `Authorization`).
- `EventSource` is GET-only; we need POST for the message body.
- The fetch + ReadableStream approach is the standard pattern for LLM streaming in modern web apps (used by ChatGPT, Claude, etc.).

Cancellation: the hook holds an `AbortController`; calling `cancel()` aborts the fetch, which closes the upstream connection, which the edge function detects and aborts the provider call.

---

## Capacitor / mobile considerations

- iOS/Android WebViews fully support `fetch` + `ReadableStream` since iOS 15 / Android 10 (well below our floor).
- Heartbeat: every ~15 s of silence, the edge function emits a comment line `: heartbeat\n\n`. This keeps middleboxes from killing the connection on slow streams. Standard SSE practice.

---

## Logging & observability for streams

- `ai_usage_logs` row is written **once per stream**, when the stream ends (or terminally errors). Token counts are filled from the final `usage` frame.
- For multi-provider streams (with provider-change), a single row is written for the **last provider that succeeded**, plus a `fallback_depth` reflecting how many we went through.
- The dashboard's `latency_ms` for streaming features means **time-to-first-token**, not total stream duration. Total duration is captured separately as `metadata->>'stream_duration_ms'`.

---

## Trade-offs we're explicitly accepting

1. **On fallback during streaming, we restart from scratch.** Alternative ("continue where we left off with new provider") is incoherent because models don't share state. The brief flicker is the better UX.
2. **`text/event-stream` is one-way.** If we ever need bidirectional streaming (e.g., user can interrupt mid-generation with new context), we'd add a separate WebSocket-based feature. Out of scope for this plan.
3. **Heartbeats add ~50 bytes every 15 s.** Negligible.
4. **Token counting is provider-dependent.** Some providers send running counts mid-stream, some only at the end. We log the final count consistently; the dashboard treats per-stream tokens as "final" only.

---

## What gets streamed and what doesn't

Per `04-feature-routing-map.md`. Recap:

**Streaming (`true`):** `bullet.rewrite`, `section.enhance`, `section.shorten`, `section.add_metrics`, `resume.tailor`, `resume.tailor_section`, `resume.detect_humanize`, `resume.fill_gap`, `resume.explain_gap`, `cover_letter.generate`, `resignation_letter.generate`, `portfolio.generate_bio`, `linkedin.optimize`, `interview.chat_turn`, `career.path_advisor`, `chat.agentic`, `chat.wise_ai`, `wisehire.write_jd`.

> `chat.portfolio_visitor` is BYOK-only and outside the managed routing config; its streaming behavior is implemented inside `ask-portfolio` independently of this design.

**One-shot (`false`):** parsing (parse-resume, parse-linkedin, parse-job-*) — the front-end needs the full structured JSON before it can do anything; analysis, classification, and bulk batch features are also one-shot.

---

## Failure modes & handling

| Failure | Behavior |
|---|---|
| Network drops mid-stream | Front-end's fetch reader throws; hook surfaces `error` and stops. User can retry. |
| Provider sends malformed SSE | Edge function logs to Sentry, emits `event: error`, closes stream. |
| User navigates away | `AbortController` triggers; edge function detects abort and stops the upstream provider call. No tokens billed for nothing. |
| Heartbeat timeout | Edge function emits `: heartbeat`, conn stays alive. |
| Provider returns 429 mid-stream | We treat it as a primary failure, send `event: provider-change`, restart from the next fallback. |
| All providers fail | `event: error` with `ai.all_providers_unavailable`, friendly toast on the front-end. |
