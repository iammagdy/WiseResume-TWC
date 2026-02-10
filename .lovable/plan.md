

# Fix: Move Frontend Files to Project Root

## Problem
The app won't build because there is no `package.json` in the root directory. All app files (source code, package.json, configs) live inside a `frontend/` subfolder, but the platform expects them at the project root.

## Solution
Move the contents of `frontend/` to the root directory so the build system can find `package.json`, `src/`, and all other required files.

## Steps

### 1. Move all key frontend files/folders to root
The following will be copied from `frontend/` to the project root:
- `package.json` (critical -- this is what's missing)
- `src/` folder (all components, hooks, pages, etc.)
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `tailwind.config.ts`, `postcss.config.js`
- `components.json`
- `eslint.config.js`
- `vitest.config.ts`
- `capacitor.config.ts`
- `public/` folder (icons, manifest, favicon, etc.)
- `bun.lockb`
- `supabase/` folder (edge functions and migrations -- will merge with existing root `supabase/`)

### 2. Update root config files
- **`vite.config.ts`**: Remove `root: "frontend"`, update aliases to point to `./src` instead of `./frontend/src`, set port to `8080`
- **`index.html`**: Update script src from `/frontend/src/main.tsx` to `/src/main.tsx`

### 3. Clean up
- Remove the now-redundant `frontend/` directory
- Remove the duplicate `src/integrations/supabase/` files that were created at root as a workaround

## What This Fixes
- Build error: "no package.json found"
- The app will load and run correctly again
- All existing functionality remains unchanged

## Note
This is a one-time structural fix. After this, all development will happen at the root level as the platform expects.

