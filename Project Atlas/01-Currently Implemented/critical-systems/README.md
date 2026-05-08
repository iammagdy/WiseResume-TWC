# Critical Systems

**Last verified:** 2026-05-08
**Type:** index

Deep-dive cards for cross-cutting platform systems that every contributor and every agent must understand before touching the code.

| # | Card | Owner |
|---|---|---|
| 01 | [Auth bridge (Kinde → Supabase)](./01-auth-bridge.md) | `src/contexts/AuthContext.tsx`, `_shared/authMiddleware.ts`, token-exchange |
| 02 | [AI routing 8-step chain](./02-ai-routing-chain.md) | `_shared/aiClient.ts` + `_shared/modelRouter.ts` |
| 03 | [Credits + BYOK](./03-credits-and-byok.md) | `_shared/creditUtils.ts` (BYOK fully removed; card retained for history) |
| 04 | [Rate limiting (multi-layer)](./04-rate-limiting.md) | `_shared/rateLimiter.ts` + `_shared/userRateLimiter.ts` |
| 05 | [WiseHire Phase 1 surface](./05-wisehire-phase-1.md) | `specs/001-wisehire-hr-platform/` |
| 06 | [Admin Dev Kit](./06-admin-dev-kit.md) | `_shared/adminAuth.ts`, `admin-*` edge fns, Express `/api/fn/admin-*` bridge |
| 07 | [Storage buckets](./07-storage-buckets.md) | Supabase Storage |
| 08 | [Deployment](./08-deployment.md) | `scripts/deploy-functions.sh`, `scripts/smoke-test-edge-functions.mjs`, GitHub Actions |
| 09 | [Security model (4-layer invariant)](./09-security-model.md) | `project-governance/ARCHITECTURE.md` |
| 10 | [WiseResume AI Studio + agentic chat](./10-ai-studio-and-agentic-chat.md) | `agentic-chat` edge fn + AI Studio components |
| 13 | [Mobile (Expo)](./13-mobile-expo.md) | `mobile/` Expo client + `mobile-api`, `mobile-config`, `register-push-token`, `send-push` |
| 14 | [MCP server + Agent Skills](./14-mcp-and-agent-skills.md) | `public/.well-known/{mcp,agent-skills,oauth-*,openid-configuration}/` + `functions/_middleware.ts` |
| 15 | [Cron jobs + scheduled edge functions](./15-cron-jobs.md) | `_shared/webhookAuth.ts` `requireCronSecretOrVault` |
| 16 | [Feature flags + kill switches](./16-feature-flags-and-kill-switches.md) | `feature_flags` table + `_shared/featureFlags.ts` + frontend rollout shims |
| 17 | [Ops health + error streams](./17-ops-health-and-error-streams.md) | `ops_health_events` + `edge_function_logs` + `error_log` + `_shared/{opsHealth,fnLogger,scrubSecrets}.ts` |
| 18 | [Admin impersonation](./18-impersonation.md) | `admin-impersonate` + `impersonation_revocations` + `impersonationStore` |

> Numbers 11 and 12 are intentionally vacant (reserved for systems documented elsewhere or merged into adjacent cards).
