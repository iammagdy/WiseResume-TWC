# Public surfaces (`public/`)

**Last verified:** 2026-05-08

Static assets served directly from the build root. Holds discovery / agent / OAuth metadata, runtime data files, and public docs.

| Card | Covers |
|---|---|
| `well-known.md` | `public/.well-known/` — MCP server card, agent skills, API catalog, OAuth/OIDC discovery, mobile universal-links. |
| `data-and-docs.md` | `public/data/` (runtime JSON), `public/docs/` (public API docs), `public/changelog.json`, root assets, `_headers`/`_redirects`. |
