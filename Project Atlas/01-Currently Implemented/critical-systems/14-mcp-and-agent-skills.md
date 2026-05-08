# 14 — MCP server + Agent Skills

**Last verified:** 2026-05-08
**Type:** critical-system card
**Sources:** `public/.well-known/mcp/`, `public/.well-known/agent-skills/`, `public/.well-known/api-catalog/`, `public/.well-known/oauth-authorization-server/`, `public/.well-known/oauth-protected-resource/`, `public/.well-known/openid-configuration/`, `functions/_middleware.ts`.

**Canonical owner:** Agent-facing discovery surface.

---

WiseResume publishes itself to AI agents through three coupled standards:

1. **MCP server card** — `public/.well-known/mcp/server-card.json`. Declares the platform as a Model Context Protocol server, points discovery clients at the OAuth-protected-resource doc and at the agent-skills index.
2. **Agent Skills (v0.2.0)** — `public/.well-known/agent-skills/index.json` lists each skill with a SHA-256 of its detailed skill JSON. Each skill JSON (e.g. `start-resume.json`) declares an `entrypoint`, `method`, `input_schema`, and `output_schema`.
3. **OAuth / OIDC discovery** — `oauth-authorization-server/`, `oauth-protected-resource/`, `openid-configuration/`. Delegates auth to Kinde at `thewisecloud.kinde.com` (custom domain `auth.thewise.cloud`).

Companion: `functions/_middleware.ts` (Cloudflare Pages middleware) returns a hand-authored markdown view of `/` (and `/index.html`) for agents requesting `Accept: text/markdown`. The hand-authored markdown links onward to other public routes (e.g. `/enterprises`), which are served via the generic HTML→markdown extraction path.

## Currently published skills
- `start-resume` (v0.1.0) — opens the WiseResume builder at `/?tailor=1` with an optional `job_description` input.

## How agents discover us
1. Fetch `/.well-known/mcp/server-card.json`.
2. Follow the `capabilities.resources.agent_skills` URL → `agent-skills/index.json`.
3. For each listed skill, verify `sha256` and fetch the skill JSON.
4. Authenticate via OAuth using `authorization.metadata_url` (Kinde).
5. Use `Accept: text/markdown` on public routes for low-token-cost reads.

## Hard rules
- `agent-skills/index.json` MUST list every skill with a current `sha256` — agents reject mismatched manifests.
- Any new skill requires: a new `<id>.json` file, a new entry in `index.json` with the recomputed SHA-256, and (if its surface should be readable as markdown to agents) corroborating updates in the `HOME_MARKDOWN` block of `functions/_middleware.ts`.
- OAuth discovery files must remain in lock-step with the Kinde tenant config — see `critical-systems/01-auth-bridge.md`.
- Never hand-edit a `.well-known` file in production — bake into the build, deploy, then verify with `curl -H 'Accept: application/json'`.
