

# Production Readiness and Code Cleanup

## Overview
Based on your uploaded implementation plan, here is what we can action within Lovable Cloud, adapted to respect platform constraints (auto-generated files, Cloud infrastructure).

---

## Phase 1: Branding and Config Cleanup

### 1.1 `capacitor.config.ts` -- Update app ID and remove remote server URL
- Change `appId` from `'app.lovable.c36…'` to `'com.wiseresume.app'`
- Remove the `server.url` pointing to `lovableproject.com` so the APK loads from the local `dist/` bundle
- Keep all `android`, `ios`, and `plugins` config intact

### 1.2 `index.html` -- Remove stale preconnects and placeholder images
- Remove the `<link rel="preconnect" href="https://cdn.gpteng.co" />` line (unused GPTEngineer CDN)
- Replace placeholder OG/Twitter image URLs (`placehold.co`) with the app favicon or remove them

### 1.3 `package.json` -- Version bump and dependency cleanup
- Set `"version": "1.0.0"`
- Move `@testing-library/dom` from `dependencies` to `devDependencies`
- Add Capacitor convenience scripts: `"cap:sync"`, `"cap:build"`, `"cap:open"`
- **Note**: `@lovable.dev/cloud-auth-js` is actively used for Google OAuth on the Auth page -- it must stay. `lovable-tagger` is used in `vite.config.ts` for dev mode -- it stays in devDependencies.

### 1.4 Remove temporary toast test panel
- Remove the floating test buttons added to `src/pages/DashboardPage.tsx` (no longer needed after visual verification)

---

## Phase 2: Console Log Cleanup

Only 4 `console.log` statements exist in frontend code (all in PDF parsing). Approximately 230 exist across 17 edge functions.

### 2.1 Frontend (`src/lib/`) -- Wrap debug logs
- In `src/lib/pdfParser.ts`: wrap 3 `console.log` calls behind `import.meta.env.DEV`
- In `src/lib/pdf/textExtractor.ts`: wrap 1 `console.log` call behind `import.meta.env.DEV`
- Keep all `console.error` and `console.warn` statements (needed for production debugging)

### 2.2 Edge Functions -- No changes
- Edge function `console.log` statements are server-side only and do not leak to users. They are useful for backend debugging via Cloud logs. Recommend leaving them as-is.

---

## Phase 3: Stale Lock File Removal

- Delete `bun.lockb` (stale, project uses npm)
- Delete `pnpm-lock.yaml` (stale, project uses npm)
- Keep `package-lock.json` as the single source of truth

---

## What Cannot Be Done in Lovable Cloud

The following items from your plan require local CLI tools and cannot be executed here:

- Generating the `android/` directory (`npx cap add android`) -- must be done locally
- Running `npm prune` -- requires local terminal
- Deleting the `.lovable/` directory -- this is a platform-managed directory
- Editing auto-generated files (`supabase/config.toml`, `.env`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`)

---

## Summary of File Changes

| File | Change |
|------|--------|
| `capacitor.config.ts` | Update appId, remove remote server.url |
| `index.html` | Remove gpteng.co preconnect, fix OG image URLs |
| `package.json` | Version 1.0.0, move test dep, add cap scripts |
| `src/pages/DashboardPage.tsx` | Remove temporary toast test panel |
| `src/lib/pdfParser.ts` | Wrap 3 console.log in DEV guard |
| `src/lib/pdf/textExtractor.ts` | Wrap 1 console.log in DEV guard |
| `bun.lockb` | Delete |
| `pnpm-lock.yaml` | Delete |

