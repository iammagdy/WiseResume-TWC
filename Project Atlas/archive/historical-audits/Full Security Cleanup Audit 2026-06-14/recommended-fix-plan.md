# Recommended Fix Plan - WiseResume 2026-06-14

## Quick Actions (No Approval Needed)

### 1. Workflow Fix (5 min)
**File:** `.github/workflows/deploy-appwrite-hubs.yml:86`
```yaml
# Change:
FRONTEND_URL: https://resume.thewise.cloud
# To:
FRONTEND_URL: https://wiseresume.app
```

### 2. Remove Empty Folder (1 min)
```bash
rmdir appwrite-hubs/revenuecat-webhook
```

### 3. Remove Stale Workflow Var (2 min)
**File:** `.github/workflows/deploy-appwrite-hubs.yml`
Remove `DEVKIT_PASSWORD` from env section.

## Phase 1: Safe Cleanup (Week 1)

| Action | File(s) | Command/Change |
|--------|---------|----------------|
| Move testing-lib to devDeps | package.json | `npm uninstall @testing-library/dom && npm install -D @testing-library/dom` |
| Check unused deps | - | `npx depcheck` |
| Run security audit | - | `npm audit --omit=dev` |
| Remove console.logs | `api/export/pdf-native.ts`, `tests/` | Remove debug logs, keep error logs |
| Consolidate docs | `docs/project-atlas/` | Move to `Project Atlas/archives/` |

## Phase 2: Test Updates (Week 2)

| Action | Pattern | Replace |
|--------|---------|---------|
| Update test mocks | Supabase mocks | Appwrite mocks |
| Update domains | `resume.thewise.cloud` | `wiseresume.app` |

## Phase 3: Frontend (Week 3)

| Action | Target |
|--------|--------|
| Review remaining console.logs | `src/hooks/useWebSpeechFallback.ts`, `src/lib/pdfParser.ts` |
| Remove verified unused components | `curatedCourses.ts`, `sectionParsers.ts` (verify first) |
| Update error translations | `src/lib/devkit/errorTranslate.ts` |

## Phase 4: Backend (Requires Approval)

| Action | Complexity | Risk |
|--------|------------|------|
| Add idempotency cache cleanup | Medium | Low |
| Persistent email rate limit | High | Medium |
| Verify AI log sanitization | Low | Low |

## Product Decisions Needed

| Item | Options |
|------|---------|
| Mobile app code | Keep / Archive / Delete |
| CHANGELOG size | Keep as-is / Archive pre-2026 |
| Drizzle/PostgreSQL | Keep (server needs) / Remove (Appwrite-only) |

## Validation Commands

```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Tests
npm run test
npm run test:e2e

# Lint
npm run lint

# Unused deps
npx depcheck

# Security audit
npm audit --omit=dev
```

## Do Not Touch

| Item | Reason |
|------|--------|
| AI Gateway core logic | Recently hardened (Phase 1-4) |
| Auth patterns | Working correctly, high breakage risk |
| `textPreprocessor.ts` encoding fixes | Intentional mojibake recovery |
| Appwrite collection permissions | Verified correct |

## Risk Priority

1. **High:** Workflow FRONTEND_URL stale
2. **High:** Console.log cleanup
3. **Medium:** Test file Supabase references
4. **Medium:** Unused dependencies
5. **Low:** Empty folders, stale docs
