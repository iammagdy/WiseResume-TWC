# Session Log - 2026-05-15 - Codebase Health Audit

## Context

Read-only audit requested for the Appwrite-native codebase. Scope was: performance risks, AI tool/button failure risks, remaining Supabase/Kinde dependencies, and page-level health across the app. No application code, schema, or deployment changes were made in this session.

---

## Verification performed

- `npm exec tsc -- --noEmit` - passed
- `npm run build` - passed
- `node --check scripts/deploy_hubs.cjs` - passed
- `git status --short --branch` - clean workspace on `main...origin/main`

---

## Root findings

### 1. AI gateway contract drift is the largest verified app risk

**Root cause**
- `src/lib/appwrite-functions.ts` routes many feature names to Appwrite Function `ai-gateway`.
- `appwrite-hubs/ai-gateway/src/main.js` only gives `parse-resume` a dedicated structured path.
- Most other routed features fall through the generic chat path and return:
  - `{ content, providerUsed, modelUsed, routedByFeature }`
- Multiple frontend callers expect typed payloads, not generic chat content.

**Verified examples**
- `src/lib/aiAnalysis.ts` expects analysis fields such as score/gaps from `analyze-resume`.
- `src/lib/aiTailor.ts` expects structured resume/cover-letter outputs from `tailor-resume` and `generate-cover-letter`.
- `src/components/editor/ai/RecruiterSimSheet.tsx` expects `success` and `analysis` from `recruiter-simulation`.
- `src/components/editor/ai/AIDetectorSheet.tsx` expects typed detection output from `detect-and-humanize`.
- AI Studio sheets using `wise-ai-chat` send feature payloads, but the gateway generic builder ignores those payload contracts unless `messages` are already provided.

**Current state**
- `parse-resume` is the main verified structured exception and is handled explicitly.
- `resume-section-ai` remains a separate healthy path where callers use the dedicated section-AI contract.

---

### 2. Frontend still references Appwrite functions that are not owned by the local hub inventory

**Root cause**
- Static scan of `appwriteFunctions.invoke(...)` calls found several invoked function names that are not present under local `appwrite-hubs/` and are not in the Appwrite AI routing allowlist.

**Verified unmapped function names**
- `admin-list-user-content`
- `admin-list-users`
- `admin-wisehire-invite`
- `coupons`
- `enhance-section`
- `submit-contact-request`
- `verify-share-password`
- `wisehire-bulk-screen`
- `wisehire-generate-brief`
- `wisehire-mask-cvs`
- `wisehire-write-jd`

**Impact by surface**
- DevKit: remaining direct admin calls in email/user-detail tools
- WiseHire: JD Writer, Brief Generator, Bulk Screen, Mask CVs
- Billing: coupon redemption paths
- Public share: password-protected share verification
- Contact fallback: fallback submit path after email failure

---

### 3. DevKit is improved, but not yet fully unified

**Root cause**
- The recent DevKit work moved many panels behind `admin-devkit-data`, but not all remaining direct admin paths were removed.

**Verified direct-call holdouts**
- `src/components/dev-kit/EmailManagementPanel.tsx` still calls `admin-list-users` and `admin-wisehire-invite`
- `src/components/dev-kit/UserDetailDrawer.tsx` still calls `admin-list-user-content`

**Current state**
- This explains why the DevKit can partially work while specific tabs or actions still fail independently of the main signed-session path.

---

### 4. Coupon flows are not aligned with the current backend routing

**Root cause**
- `validate-coupon` and `redeem-coupon` are treated as AI-routed function names in `src/lib/appwrite-bridge.ts`.
- `appwrite-hubs/ai-gateway/src/main.js` does not implement coupon logic.
- WiseHire subscription also calls a standalone `coupons` function name that is not owned by the local hub set.

**Current state**
- Pricing and upgrade-related coupon behavior is a verified integration risk from source inspection.

---

### 5. Supabase/Kinde runtime migration is mostly complete, but legacy stubs remain

**Verified clean state**
- No active production import path to Supabase or Kinde auth/client SDKs was found in `src/`, `appwrite-hubs/`, `server/`, or `scripts/`.

**Verified legacy remnants**
- `src/lib/apiFetch.ts` is an intentional fail-fast stub
- `src/lib/apiFnUrl.ts` still exposes a migration placeholder path
- `src/lib/accountBackup.ts` still throws pending Appwrite migration errors
- `server/index.ts` returns `503 pending_appwrite_migration` for legacy `/api/*` paths
- A small number of tests and one DevKit identity label still reference Supabase/Kinde-era naming

**Current state**
- The remaining issue is not an active legacy SDK dependency. It is leftover migration scaffolding and stale terminology.

---

### 6. Performance risks are concentrated in large chunks and ineffective splitting

**Build evidence**
- Vite built successfully but reported oversized chunks.
- Largest emitted assets/chunks observed during build:
  - `doc-export` about 1.47 MB
  - `pdf.worker` about 1.32 MB
  - `ocr` about 1.02 MB
  - `monitoring` about 463 KB
  - `DevToolsPage` about 450 KB
  - `charts` about 431 KB

**Verified split issues**
- `src/lib/pdf/textPreprocessor.ts` is both dynamically and statically imported, so the dynamic import does not split.
- `src/lib/captureErrorShim.ts` is both dynamically and statically imported, so the dynamic import does not split.

**Verified app-shell costs**
- `src/AppInterior.tsx` prefetches Dashboard, Upload, and Editor during idle.
- `DeferredProviders` mounts delayed non-essential providers for all non-public routes.
- `ToastTestButton` is rendered in the interior app shell and appears to be a test/developer utility present in normal routes.

---

## Page and feature health

### Public pages
- Route map is present and complete.
- Static audit did not find Supabase/Kinde runtime blockers on public routes.
- Public utility pages previously received WebGL stabilization work; no new route-level build blocker was found in this audit.

### Auth and account
- Auth is Appwrite-native from source inspection.
- No active Kinde provider path was found.

### Upload / editor / resume flows
- Resume parsing stack is Appwrite-native and `parse-resume` is explicitly handled in `ai-gateway`.
- Section AI has a dedicated path.
- Editor-side AI tools that expect structured responses remain at risk where they route into generic `ai-gateway` chat output.

### AI Studio
- Source audit shows high contract risk because several tools depend on `wise-ai-chat` while the gateway generic message builder does not consume their typed payload contract.

### Pricing / subscription
- Coupon-related flows remain a verified integration risk because the frontend function names and the local backend ownership do not line up.

### WiseHire
- Several WiseHire function names are referenced by the frontend, but no matching local hub source was found for them.
- WiseHire feature pages that depend on those function names are not source-backed in the current repo state.

### Portfolio / public share
- Public portfolio paths are Appwrite-native.
- Password-protected share verification remains at risk because `verify-share-password` is called from the frontend but is not locally owned by the current hub inventory.

### DevKit
- Core DevKit architecture is Appwrite-native and much healthier than the older mixed model.
- Remaining failures are concentrated in orphan direct function calls rather than the main signed-session design.

---

## Where we stopped

- This session was documentation and audit only. No runtime fixes were applied.
- The highest-priority engineering follow-up is to build a verified function inventory so every frontend function name maps to one owned Appwrite Function or one explicit `ai-gateway` action.
- After the inventory pass, the next priority is AI contract repair: either add dedicated structured handlers inside `ai-gateway` for each typed feature, or stop routing typed features through the generic chat path.
- DevKit follow-up is narrower: remove the remaining direct standalone admin calls and move them behind `admin-devkit-data`.
- Coupon and WiseHire function ownership should be verified next, because those paths still show source-level drift between frontend callers and backend inventory.
