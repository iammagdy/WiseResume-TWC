# `public/.well-known/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `public/.well-known/`.

**Canonical owner:** Public discovery surface for AI agents, OAuth/OIDC clients, and mobile universal links.

---

| Path | Purpose | Notes |
|---|---|---|
| `mcp/server-card.json` | **MCP server card** — declares WiseResume as a Model Context Protocol server for AI agents. | OAuth-protected via Kinde (`thewisecloud.kinde.com`). Tool discovery via `webmcp` from `https://resume.thewise.cloud/`. Resources point at `api-catalog` + `agent-skills`. See `critical-systems/14-mcp-and-agent-skills.md`. |
| `agent-skills/index.json` | Agent-skills index (v0.2.0). Lists each available skill with SHA-256 of its skill JSON. | Currently lists `start-resume`. |
| `agent-skills/start-resume.json` | Skill: opens the WiseResume builder for a new AI-tailored resume from a job description. Entrypoint `https://resume.thewise.cloud/?tailor=1`, `GET`, optional `job_description` input. | License: proprietary. |
| `api-catalog/` | API catalog discovery files for agents. | Linked from MCP server card. |
| `oauth-authorization-server/` | OAuth 2.0 Authorization Server metadata. | Delegates to Kinde. |
| `oauth-protected-resource/` | OAuth 2.0 Protected Resource metadata. | Linked from MCP server card. |
| `openid-configuration/` | OpenID Connect discovery. | Aligns with Kinde custom domain (`auth.thewise.cloud`). |
| `apple-app-site-association` | iOS Universal Links manifest (mobile deep links). | Mirrored in `mobile-expo` critical-system. |
| `assetlinks.json` | Android App Links manifest. | Mirrored in `mobile-expo` critical-system. |

## Hard rules
- The MCP card + agent-skills + OAuth/OIDC docs together form an **agent-facing API surface**. Changing any one without the others breaks discovery.
- `agent-skills/index.json` lists each skill with a `sha256` — recompute and update on every skill JSON change or agents will reject the manifest.
- Universal-link / app-link files must keep the bundle/team/package IDs aligned with the Expo client config (`mobile/app.config.ts`).
