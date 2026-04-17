# Frontend Layer

**Last verified:** 2026-04-17
**Type:** index
**Sources:**
- `src/hooks/`, `src/store/`, `src/lib/`, `src/components/`
- `src/AppInterior.tsx`, `src/main.tsx`, `src/App.tsx`
- `replit.md` (Frontend Architecture + State Management + Hook patterns)
- `project-governance/ARCHITECTURE.md` §1 (Tech Stack), §3 (Authentication Bridge)

**Canonical owner:** `replit.md` (Frontend Architecture sections).

---

This folder catalogues the frontend layers that aren't pages, edge functions, or DB tables. They are grouped by role rather than carded one-per-file because the surface area is too broad to keep one-card-per-file synchronised by hand.

For each subsection below, the **source folder is authoritative**. Treat this as a navigation aid, not a contract.

## See also
- [hooks.md](./hooks.md) — TanStack Query + custom hooks (the data-fetching layer)
- [stores.md](./stores.md) — Zustand stores (in-memory + persisted UI state)
- [lib.md](./lib.md) — `src/lib/` utilities (PDF/DOCX, AI helpers, redaction, exports)
- [components.md](./components.md) — Component subfolder map
- [routing-and-app-shell.md](./routing-and-app-shell.md) — `App.tsx`, `AppInterior.tsx`, providers, guards
