# Frontend test setup + shims (`src/test/`, `src/shims/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/test/`, `src/shims/`, `vitest.config.ts`.

**Canonical owner:** `src/test/` for shared Vitest setup; `src/shims/` for runtime polyfills mapped through Vite aliases.

---

## `src/test/`
Holds the global Vitest setup (DOM polyfills, mock initializers, common stubs). Loaded via `setupFiles` in `vitest.config.ts`. Per-feature specs live next to their feature in `__tests__/` folders (see `src/components/editor/__tests__/`, `src/components/interview/__tests__/`, `src/components/layout/__tests__/`, `src/components/templates/__tests__/`, `src/contexts/__tests__/`).

## `src/shims/pako.ts`
Shim for the `pako` (zlib in JS) library, mapped via Vite alias. Avoids pulling the heavy upstream bundle when only a thin compression surface is needed. Used by PDF/image processing paths that need zlib-compressed payloads.

## Hard rules
- Per-feature specs must live under `__tests__/` next to the code they cover; only cross-cutting setup belongs in `src/test/`.
- Shim alias is configured in `vite.config.ts`. If pako usage grows beyond the shim's surface, switch to the real package — do not silently extend the shim.
