# Mobile (Capacitor 8)

Native iOS/Android shells wrapping the same Vite-built web app. Full
architecture: `Project Atlas/01-Currently Implemented/critical-systems/
09-mobile-capacitor.md`.

## Prerequisites
- iOS: macOS + Xcode 15+ + CocoaPods (cannot build on Linux).
- Android: Android Studio + JDK 17 + Android SDK 34.
- Node ≥ 22 (enforced via `package.json#engines`).

## One-time setup (per machine)
```bash
npm install
npx cap add ios       # macOS only
npx cap add android   # any OS w/ Android Studio
```
`ios/` and `android/` are gitignored — re-run `cap add` on fresh clones.

## Build, sync, open
Always use `mobile:sync` (NOT `npm run build`) — it strips the admin
DevKit from the bundle:
```bash
npm run mobile:sync           # build:mobile && cap sync
npm run mobile:open:ios       # opens Xcode
npm run mobile:open:android   # opens Android Studio
```
`build:mobile` = `tsc --noEmit && vite build --mode mobile &&
check-no-sourcemaps && check-mobile-bundle`. Verifier fails the build
if any DevKit chunk leaks into `dist/assets/`.

For TestFlight: Xcode → Product → Archive → Distribute App.
For Play Console internal testing: Android Studio → Build → Generate
Signed App Bundle, upload `.aab`.

## Live-reload during native dev (optional)
Uncomment the override in `capacitor.config.ts`:
```ts
server: {
  androidScheme: 'https',
  url: 'http://192.168.1.100:5000', // your LAN IP, NOT localhost
  cleartext: true,
}
```
Then `npx cap sync` and `npm run dev`. **Never commit uncommented.**

## Backend wiring
Mobile binaries call production Supabase + Kinde, baked in at build
time via `VITE_SUPABASE_URL` / `VITE_KINDE_*`. No Express proxy on
mobile — `apiFnUrl()` auto-routes to
`${VITE_SUPABASE_URL}/functions/v1/<name>` whenever
`import.meta.env.DEV` is false (true for any `vite build`).

## Why DevKit is excluded
`vite.config.ts` rewrites `import.meta.env.VITE_DISABLE_DEVKIT` to
`"true"` in mode=mobile; `AppInterior.tsx` branches the lazy
`DevToolsPage` import to a stub on that constant; Vite tree-shakes the
unused branch. `scripts/check-mobile-bundle.mjs` enforces it.
