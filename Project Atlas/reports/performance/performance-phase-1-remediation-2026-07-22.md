# WiseResume Performance Phase 1 Remediation - 2026-07-22

## Verdict

`PASS_WITH_WARNINGS`

The three scoped public-path defects are fixed and production verified. The warning is an existing authenticated Broadcast schema mismatch: the workspace query expects `active`, but the live collection does not expose that attribute.

## Scope

Fixed:

1. Universal Recharts/D3 download caused by shared helper ownership.
2. Global public prefetch of the authenticated Editor route.
3. Broadcast collection requests on public standalone routes and before auth readiness.

Not changed: Editor hydration, Public Portfolio image/LCP design, Tailoring timeout behavior, Appwrite functions/schema/permissions, AI routing, auth architecture, CSP, environment variables, or UI design.

## Proven Root Causes

### Charts

The baseline production entry imported `clsx` from the manually assigned charts chunk. Rollup had absorbed the shared helper into that chunk, creating:

```text
entry
-> shared clsx helper
-> charts chunk
-> Recharts/D3 downloaded globally
```

`clsx`, `class-variance-authority`, and `tailwind-merge` now belong to `ui-utils`. Recharts/D3 remain in a dedicated lazy charts chunk.

### Editor Prefetch

`EditorPage` was in Vite's universal deferred `PREFETCH_CHUNKS` list. It is now excluded globally. Existing route-aware workspace prefetch in `AppInterior` remains, so authenticated Dashboard navigation can still warm Editor.

### Broadcast

`AppInterior` mounted `BroadcastBanner` on every route and the component queried immediately. It now requires all of:

* route is not public standalone;
* auth initialization is complete;
* a user ID is present.

Authenticated failures now emit a scoped warning rather than disappearing silently.

## Build Evidence

Measurements use the same generated-entry asset set: entry script, modulepreloads, stylesheet, deferred prefetch bootstrap, and two initial fonts. Compression was calculated from production build bytes with Node zlib.

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Initial raw | 1,642,130 B | 1,211,201 B | -430,929 B (-26.24%) |
| Initial gzip | 481,898 B | 369,199 B | -112,699 B (-23.39%) |
| Initial Brotli | 408,529 B | 315,710 B | -92,819 B (-22.72%) |
| Initial JavaScript Brotli | 316,689 B | 223,870 B | -92,819 B (-29.31%) |
| Charts Brotli | 93,341 B initial | 93,229 B lazy | removed from initial path |
| Editor Brotli | 57,532 B prefetched | 57,547 B lazy | removed from global prefetch |

Final heavy lazy chunks remained separate:

| Chunk | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| `doc-export` | 1,471,864 B | 473,900 B | 403,266 B |
| `ocr` | 1,018,986 B | 261,720 B | 164,150 B |
| `DevToolsPage` | 539,160 B | 125,244 B | 97,969 B |
| `monitoring` | 463,366 B | 153,425 B | 129,959 B |

## Validation

* Focused Vitest: PASS, 2 files / 7 tests.
* Post-build Node contract: PASS, 3 tests.
* Focused changed-source ESLint: PASS.
* `npx tsc --noEmit`: PASS.
* `npm run build`: PASS, 5,818 modules; no sourcemaps.
* `git diff --check`: PASS with Windows line-ending warnings only.
* Existing unrelated lint debt: `vite.config.ts:129` still violates `@typescript-eslint/no-require-imports`.

## Deployment

* Product commit: `ddf16e168516be84ecce7816821585291fc290fe`.
* Vercel deployment: `dpl_FrRqPrrkm2nYXVSe7KXvnRqV8qP9`.
* Status: `READY`.
* Production alias: `https://wiseresume.app`.
* Appwrite deploy: `NOT REQUIRED`.

## Production Route Evidence

The browser asset inventory includes scripts, styles, fonts, images, and observed resource URLs. Compressed-body byte totals were measured separately over the observed URL set with `br, gzip` accepted. Counts/bytes are route evidence, not a Lighthouse trace; API replay status is excluded from product-pass conclusions.

| Route | Charts | Editor | Broadcast | Observed requests | Compressed-body bytes | Console |
|---|---|---|---|---:|---:|---|
| `/` | no | no | not emitted | 74 | 817,088 | clean |
| `/pricing` | no | no | not emitted | 73 | 1,007,086 | clean |
| `/guides` | no | no | not emitted | 65 | 782,764 | clean |
| `/examples` | no | no | not emitted | 84 | 860,766 | clean |
| `/p/magdy` | no | no | not emitted | 85 | 858,508 | clean |
| `/dashboard` | no | prefetched intentionally | emitted after auth | n/a | n/a | Broadcast schema warning |
| `/editor?id=6a30964e000f3d1807de` | no | loaded on navigation | workspace policy | n/a | n/a | no error |

Dashboard rendered under the existing signed-in production account. Editor was opened through the Dashboard navigation, loaded its lazy chunk, rendered its Export control, and reported no console errors.

## Mobile Follow-up

Viewport: `390x844`.

| Route | Observed requests | Compressed-body bytes | Charts | Editor | Broadcast |
|---|---:|---:|---|---|---|
| Landing `/` | 75 | 817,244 | no | no | not emitted |
| Public Portfolio `/p/magdy` | 109 | 1,506,749 | no | no | not emitted |

The browser diagnostics surface did not expose Performance Timeline/LCP/TBT. A Google PageSpeed mobile request returned HTTP `429`. Therefore LCP and TBT are `UNKNOWN`; this report does not claim that the Public Portfolio LCP/CLS/avatar problem is resolved.

## Warning

Authenticated Dashboard correctly emits the Broadcast query only after auth readiness, but production responds:

```text
400 Invalid query: Attribute not found in schema: active
```

This was previously hidden by an empty catch. It is now safely logged. Public routes no longer issue the request. Fixing the live collection contract requires a separate approved Appwrite investigation; do not broaden public permissions as a workaround.

## Remaining Performance Risks

1. Editor hard-refresh/hydration delay.
2. Public Portfolio mobile LCP/CLS/avatar behavior.
3. Tailoring no-result/timeout behavior.
