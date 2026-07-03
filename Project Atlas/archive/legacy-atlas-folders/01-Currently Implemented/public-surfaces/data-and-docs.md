# `public/data/`, `public/docs/`, root static assets

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `public/`.

---

## `public/data/`

| File | Used by |
|---|---|
| `contentLibrary.json` | Cross-app content library (suggestions, microcopy). Loaded at runtime to keep static. |
| `guidesData.json` | Backing data for `/guide` and `/guides` pages. |
| `resumeExamples.json` | Catalog for `/examples` (typed by `src/types/resumeExamples.ts`). |

## `public/docs/`

| Path | Purpose |
|---|---|
| `api/` | Public API documentation site served at `/docs/api`. Linked from `public/.well-known/mcp/server-card.json` as the MCP `documentation` URL. |

## Root assets

| File | Purpose |
|---|---|
| `changelog.json` | Drives `/whats-new` page contents (distinct from `project-governance/CHANGELOG.md`). |
| `sitemap.xml` | Search-engine sitemap. |
| `robots.txt` | Crawler policy. |
| `404.html` | SPA 404 fallback. |
| `_headers`, `_redirects` | Cloudflare/Hostinger static-host config (CSP, redirects). |
| `favicon.ico`, `favicon.png`, `favicon-wisehire.png` | Browser icons (per-brand). |
| `logo-light.png`, `logo-dark.png`, `email-logo.png`, `email-logo.webp` | Brand assets. |

## Hard rules
- `public/data/*.json` is fetched at runtime — keep payloads small and CDN-cacheable.
- `_headers` is the **only** place to declare static-host CSP/security headers — never duplicate them in app code.
- Brand assets must follow `project-governance/BRANDING.md`.
