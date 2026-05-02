# Mobile (Capacitor 8)

Wise Resume ships a native shell for iOS and Android via Capacitor. The
web layer is identical to the web build — there is no separate mobile UI.

## Why platform scaffolds are NOT in the repo

The `ios/` and `android/` directories are gitignored. They are derivative
artifacts: regenerating them from `capacitor.config.ts` is reproducible,
keeps the repo small, and avoids per-developer churn in CocoaPods /
Gradle lockfiles. Treat them like `dist/`.

## Prerequisites

- **iOS builds**: macOS + Xcode 15+ + CocoaPods. Cannot be produced on
  Linux/Windows. (Replit is Linux — iOS scaffolding must happen on a Mac.)
- **Android builds**: Android Studio (Hedgehog or newer) + JDK 17 +
  Android SDK 34. Linux works; Replit is not configured for it.
- Node ≥ 22 (already enforced via `package.json#engines`).

## One-time setup (per machine)

```bash
npm install
npx cap add ios       # macOS only
npx cap add android   # any OS with Android Studio
```

This creates the `ios/App/` and `android/` Xcode/Gradle projects from
`capacitor.config.ts`. Re-run `npx cap add <platform>` if you delete the
folders or pull a fresh clone.

## Build & sync (production binary)

Always use the dedicated mobile build script — it strips the admin DevKit
out of the bundle:

```bash
npm run mobile:sync
```

That runs `tsc --noEmit && vite build --mode mobile && node
scripts/check-mobile-bundle.mjs && cap sync`. The verifier fails the
build if any `DevToolsPage-*.js`, `AICostPanel-*.js`, etc. chunk leaks
back into `dist/assets/` — your binary will never expose admin tools.

After sync, open the IDE and run on a simulator/device:

```bash
npm run mobile:open:ios       # opens ios/App/App.xcworkspace
npm run mobile:open:android   # opens android/ in Android Studio
```

For TestFlight / Play Console internal testing:

- **iOS**: Xcode → Product → Archive → Distribute App → App Store Connect.
- **Android**: Android Studio → Build → Generate Signed App Bundle.
  Use a release keystore, then upload the `.aab` to Play Console.

## Live-reload during native development (optional)

To point the simulator at your local Vite dev server (so JS changes hot-
reload inside the native shell), uncomment the override block in
`capacitor.config.ts`:

```ts
server: {
  androidScheme: 'https',
  url: 'http://192.168.1.100:5000', // your machine's LAN IP, NOT localhost
  cleartext: true,
}
```

Then re-run `npx cap sync` and start `npm run dev`. **Never commit this
change** — the production binary must use the bundled `dist/` payload.

## Backend in production

The mobile binary talks to **production Supabase** (`VITE_SUPABASE_URL`)
and **production Kinde** (`VITE_KINDE_*`) baked in at build time. There is
no Express proxy on mobile — `apiFnUrl()` automatically routes to
`${VITE_SUPABASE_URL}/functions/v1/<name>` whenever
`import.meta.env.DEV` is false (which is true for any `vite build`,
including `--mode mobile`).

## Why DevKit is excluded from mobile

`AppInterior.tsx` resolves the `/devkit` lazy import based on
`import.meta.env.VITE_DISABLE_DEVKIT`. `vite.config.ts` rewrites that
constant to `"true"` whenever `mode === 'mobile'`, so the entire DevKit
chunk graph is dead-code-eliminated. The route still exists but renders
the `DevToolsStub` "unavailable" page. `scripts/check-mobile-bundle.mjs`
enforces the elimination after every mobile build.
