# AI / Bot Audit

## Direct Answer: Is the Bot Working?

**UNKNOWN for live functionality, FAIL for production readiness.**

The UI and backend routing paths exist for agentic chat, WiseResume AI Studio, resume analysis, resume tailoring, parsing, section AI, and cover letter generation. However, this audit did not make live AI provider calls, and inspected backend code does not visibly enforce authenticated user identity, credits, or server-side user rate limits for the main AI gateway. That is a launch blocker even if the bot returns responses in manual tests.

## AI Feature Matrix

| AI Feature | Trigger Point | Backend/Edge Function | Provider/Model Path | Credit/Rate-Limit Behavior | Failure Handling | Logging/Observability | Status | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `agentic-chat` | `src/lib/agenticChat.ts`, editor chat UI | `ai-gateway` | `FEATURE_ROUTES`, OpenRouter/Groq/DeepSeek/NVIDIA fallback | Client RPM via `rateLimiter`; no visible server credit/auth check in gateway | Typed `ChatError` classification | Sentry client only; gateway Datadog no-op | FAIL | Add server auth, per-user rate limit, credit check/deduction, redacted AI logs. |
| `wise-ai-chat` | AI Studio sheets | `ai-gateway` | Generic `buildMessages` route | Same gateway issue | Generic error classification | No proven LLM telemetry | FAIL | Add contract tests for each studio payload and server gates. |
| `editor-ai` / legacy editor tools | Editor AI sheets | `ai-gateway` | Structured feature normalization | Same gateway issue | Malformed JSON handling exists | No live tracing | FAIL | Verify all legacy aliases route to expected structured responses. |
| `analyze-resume` | `src/lib/aiAnalysis.ts`, Tailor/Studio | `ai-gateway` | Structured AI feature | Same gateway issue | Throws user-facing error via `extractErrorMessage` | No redacted request logging policy | FAIL | Add server credit enforcement and response schema tests. |
| `score-resume` | AI Studio compare / scoring | `ai-gateway` or deterministic code paths | Repo references both deterministic and AI-routed paths | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Confirm whether production uses deterministic scoring or gateway call. |
| `tailor-resume` | `src/lib/aiTailor.ts`, `/tailor` | `ai-gateway` | Structured AI feature | Same gateway issue | Retry once for transient errors; handles 401/402/429 | No proven LLM telemetry | FAIL | Add server gates and live timeout/quality smoke. |
| `parse-resume` | `src/lib/pdfParser.ts` | `ai-gateway` | Dedicated normalize path with 4000 tokens | Same gateway issue | Malformed JSON fallback across candidates | No prompt PII policy | FAIL | Add file-size limits, server auth, and parser contract tests. |
| `parse-job` | `src/lib/aiTailor.ts`, onboarding/create resume | `ai-gateway` | Structured route | Same gateway issue | Error extraction in client | UNKNOWN | FAIL | Add SSRF/URL fetch constraints if URL parsing fetches remote pages. |
| `resume-section-ai` | `GapFillerSheet`, section tailor/enhance | `resume-section-ai` hub | Own provider pool | No visible auth/credit check in hub | JSON parsing and provider fallback in hub | Minimal logs | FAIL | Require user JWT and enforce action-level credits. |
| `generate-cover-letter` | `src/lib/aiTailor.ts` | `ai-gateway` | Structured route | Same gateway issue | Client throws error if missing | UNKNOWN | FAIL | Add schema validation and server gates. |
| `smart-fit-rewrite` | `src/lib/smartFit/orchestrator.ts` | `ai-gateway` | Dedicated JSON parse path | Same gateway issue | Malformed JSON handled | UNKNOWN | FAIL | Add contract tests and credit accounting. |
| `generate-portfolio-bio` | Portfolio editor | `ai-gateway` | Structured route | Same gateway issue | Component-level errors | UNKNOWN | FAIL | Add server gates and PII prompt policy. |
| WiseHire JD/brief/bulk/mask/outreach | WiseHire pages/hooks | `wisehire-gateway` | Own provider pool with fallbacks | Requires Appwrite user except waitlist; credits not visible | Some fallback data returned | Minimal logs | UNKNOWN | Verify paid/HR gating, data isolation, and provider behavior. |

## Evidence

- `src/lib/appwrite-bridge.ts` routes AI feature names to Appwrite `ai-gateway`.
- `src/lib/appwrite-functions.ts` attaches `X-Appwrite-JWT` to non-admin calls when available.
- `appwrite-hubs/ai-gateway/src/main.js` builds provider pools from `GROQ_KEY_*`, `OPENROUTER_KEY_*`, `DEEPSEEK_KEY`, and `NVIDIA_KEY_*`.
- `appwrite-hubs/ai-gateway/src/main.js` implements dynamic route cache from `ai_routing_config`, candidate fallback, per-key backoff, and per-attempt timeouts.
- `appwrite-hubs/ai-gateway/src/main.js` does not visibly read `X-Appwrite-JWT`, call `Account.get()`, check `ai_credits`, or write usage logs in inspected sections.
- `appwrite-hubs/resume-section-ai/src/main.js` has provider fallback and action prompts, but no visible user auth/credit enforcement in searched auth/credit terms.
- `src/lib/rateLimiter.ts` is client-side in-memory only and cannot protect production cost or abuse.
- `src/hooks/useAICredits.ts` states server enforces credits, but the inspected AI gateway did not show that enforcement.

## Key Risks

| Risk | Status | Impact | Recommendation |
|---|---|---|---|
| Direct unauthenticated AI function execution | FAIL | Cost abuse, data abuse, AI provider quota drain | Require valid Appwrite JWT server-side or restrict Appwrite function execute permissions. |
| Credit bypass | FAIL | Free users can exceed plan limits; billing integrity failure | Atomic server-side credit check + increment before/after AI call. |
| Client-only rate limiting | FAIL | Easy to bypass with direct Appwrite Function calls | Add per-user/IP server-side rate limiting. |
| Resume PII sent to third-party AI providers | UNKNOWN | Privacy/regulatory risk | Publish AI data-processing policy, redact where feasible, configure provider retention controls. |
| Observability removed/no-op | FAIL | Cannot answer "is bot down?" reliably | Add redacted telemetry for request status, latency, provider, model, tokens, and error class. |
| Malformed/unsafe AI output | UNKNOWN | Broken UI or fabricated resume claims | Keep strict JSON validators; add hallucination/fact-preservation checks for rewrite paths. |

## Minimum AI Production Bar

- Every AI hub validates Appwrite JWT or signed service token.
- Every AI action maps to a cost and enforces plan/credits on the server.
- Every AI action has per-user and per-IP rate limits.
- Every structured AI feature has schema validation and fallback UI.
- Logs capture status, latency, provider, model, token counts, user ID hash, and error class, but not raw resume text or prompts.
- Production smoke proves `agentic-chat`, `parse-resume`, `analyze-resume`, `tailor-resume`, `resume-section-ai`, and `generate-cover-letter` work for a real verified account.
