# auth.md - WiseResume / WiseHire Agent Registration

**Status: Automated agent registration is not currently supported.**

WiseResume / WiseHire is an AI-powered resume builder and HR hiring suite operated by
[The Wise Cloud](https://thewise.cloud).

---

## Authentication

WiseResume uses [Appwrite](https://appwrite.io) for user identity. End-user authentication
is handled via standard OAuth 2.0 / OIDC flows:

- **Authorization Server metadata**: `/.well-known/oauth-authorization-server`
- **Protected Resource metadata**: `/.well-known/oauth-protected-resource`

These endpoints describe the live Appwrite project that manages user sessions.

---

## Agent Access

Automated agents **cannot self-register** for API access at this time. There is no
`register_uri` or machine-issued credential flow.

If you are building an integration or research tool that requires API access, please
contact the team at **support@thewise.cloud**.

---

## Public Discovery Resources

Agents may freely read the following public resources without authentication:

| Resource | URL |
|----------|-----|
| API Catalog (RFC 8288) | `/.well-known/api-catalog` |
| Agent Skills Index | `/.well-known/agent-skills/index.json` |
| MCP Server Card | `/.well-known/mcp/server-card.json` |
| API Documentation | `/docs/api` |
| Sitemap | `/sitemap.xml` |

---

*Last updated: 2026-07-09*