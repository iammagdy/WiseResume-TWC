# Frontend Layer

**Last verified:** 2026-05-08
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
- [contexts.md](./contexts.md) — React contexts (`src/contexts/` plural and `src/context/` singular)
- [types.md](./types.md) — Cross-cutting TypeScript types (`src/types/`)
- [integrations-supabase.md](./integrations-supabase.md) — Frontend Supabase client + edge-fn invocation + rollout flags (`src/integrations/supabase/`)
- [test-setup.md](./test-setup.md) — Frontend test setup (`src/test/`) and runtime shims (`src/shims/`)
