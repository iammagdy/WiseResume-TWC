# Dependencies & Workflows Audit - WiseResume 2026-06-14

**Scope:** npm dependencies, devDependencies, GitHub Actions, scripts  
**Tools:** npm audit, package.json analysis, workflow inspection

---

## Dependency Overview

| Category | Count | Notes |
|----------|-------|-------|
| dependencies | 122 | Runtime dependencies |
| devDependencies | 32 | Build/test tools |

---

## Potentially Unused Dependencies (To Verify)

### Runtime Dependencies (dependencies)

| Package | Listed Version | Usage | Recommendation |
|---------|----------------|-------|----------------|
| `@testing-library/dom` | ^10.4.1 | Should be devDependency | Move to devDependencies |
| `@types/diff` | ^7.0.2 | Dev only? | Move to devDependencies |
| `@types/pg` | ^8.20.0 | If PostgreSQL not used | Verify usage |
| `@vercel/node` | ^5.8.3 | Vercel functions | Keep |
| `basic-ftp` | ^6.0.1 | Legacy FTP? | Verify if used |
| `drizzle-kit` | ^0.31.10 | Dev tool | Move to devDependencies |
| `drizzle-orm` | ^0.45.2 | ORM | Verify if Appwrite-only now |
| `pg` | ^8.20.0 | PostgreSQL | Verify if still used |

### Dev Dependencies Analysis

All devDependencies appear correctly categorized.

---

## Security Audit Status

### npm audit

**Status:** Not run (user restriction: "Do not run autofix")

**Command to run:**
```bash
npm audit --omit=dev
```

**Note:** Run manually to check for vulnerabilities. Do not run `npm audit fix` without review.

### Dependency Overrides

| Package | Override | Reason |
|---------|----------|--------|
| `serialize-javascript` | 7.0.5 | Security fix |
| `esbuild` | ^0.25.12 | Build compatibility |

**Status:** ✓ Overrides properly configured

---

## GitHub Actions Workflows

### Inventory

| Workflow | Purpose | Status | Notes |
|----------|---------|--------|-------|
| `deploy-appwrite-hubs.yml` | Deploy Appwrite functions | ✓ Active | Manual trigger only |
| `deploy-landing.yml` | Deploy landing page | ✓ Active | Verify if used |

### deploy-appwrite-hubs.yml Analysis

**Strengths:**
- Manual trigger only (workflow_dispatch) ✓
- Concurrency control prevents conflicts ✓
- Source hash verification ensures committed state ✓
- Environment variables properly passed ✓

**Issues:**

1. **Stale FRONTEND_URL**
   ```yaml
   FRONTEND_URL: https://resume.thewise.cloud  # Should be wiseresume.app
   ```

2. **Unused DEVKIT_PASSWORD**
   - Still referenced in workflow
   - Password auth removed per CHANGELOG
   - Safe to remove

3. **Multiple AI Provider Keys**
   - 3 OpenRouter keys
   - 3 Groq keys
   - 3 Nvidia keys
   - Acceptable for rotation strategy

### deploy-landing.yml Analysis

**Status:** Verify if actively used
- Landing page may be managed separately
- Check if workflow runs successfully

---

## NPM Scripts Analysis

### Build Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `build` | Production build | ✓ Uses tsc --noEmit |
| `build:dev` | Dev build | ✓ |
| `build:server` | Server build | ✓ |
| `build:all` | Combined build | ✓ |

### Database Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `db:push` | Drizzle push | ⚠️ Verify if still used with Appwrite |
| `db:studio` | Drizzle studio | ⚠️ Verify if still used |
| `db:generate` | Drizzle generate | ⚠️ Verify if still used |

**Note:** Drizzle scripts may be legacy from Supabase era. Appwrite uses different schema management.

### Test Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `test` | Vitest run | ✓ |
| `test:watch` | Vitest watch | ✓ |
| `test:coverage` | Coverage | ✓ |
| `test:e2e` | Playwright | ✓ |

**Status:** ✓ Comprehensive test setup

### Development Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `dev` | Vite dev server | ✓ |
| `dev:pdf-server` | PDF server dev | ✓ |
| `start` | Production start | ✓ |
| `server` | Express server | ✓ |

---

## Package.json Issues

### Version

```json
"version": "4.7.3"
```

**Status:** ✓ Properly versioned

### Engines

```json
"engines": {
  "node": ">=22.0.0"
}
```

**Status:** ✓ Node 22 required (matches Appwrite runtime)

### Type

```json
"type": "module"
```

**Status:** ✓ ES modules

---

## Unused Dependencies Detection

### Method: Import Analysis

**Command to run for verification:**
```bash
npx depcheck
```

**Likely unused (to verify):**

1. **Server-side dependencies if only using Appwrite:**
   - `express` (if not using local server)
   - `cors` (if not using local server)
   - `drizzle-orm` (if Appwrite-native)
   - `drizzle-kit` (dev tool, likely unused)
   - `pg` (PostgreSQL, likely unused)

2. **Potentially unused client-side:**
   - `ogl` (WebGL library, verify usage)
   - `lenis` (smooth scroll, verify usage)

### Recommendations

| Package | Likely Used? | Action |
|---------|--------------|--------|
| `@testing-library/dom` | Yes, but wrong category | Move to devDeps |
| `drizzle-kit` | No (Appwrite-native) | Move to devDeps or remove |
| `drizzle-orm` | Verify | May be unused |
| `pg` | Verify | May be unused |
| `express` | Verify | May be unused |
| `cors` | Verify | May be unused |

---

## Workflow Security

### Secrets Management

| Workflow | Secrets Used | Status |
|----------|--------------|--------|
| deploy-appwrite-hubs | 15+ secrets | ✓ All via secrets.* |

**Status:** ✓ No hardcoded secrets

### Permissions

| Workflow | Permissions | Status |
|----------|-------------|--------|
| deploy-appwrite-hubs | Default | ⚠️ Add explicit permissions |

**Recommendation:** Add least-privilege permissions:
```yaml
permissions:
  contents: read
  actions: write  # For deployment
```

### Concurrency

**Status:** ✓ Concurrency configured to prevent conflicts

```yaml
concurrency:
  group: deploy-appwrite-hubs-${{ github.ref }}
  cancel-in-progress: true
```

---

## Build Process Analysis

### Vite Configuration

**File:** `vite.config.ts`

**Observations:**
- Uses standard Vite React plugin
- Rollup visualizer for bundle analysis
- Server proxy configuration

### TypeScript Configuration

**Files:**
- `tsconfig.json` - Base config
- `tsconfig.app.json` - App config
- `tsconfig.node.json` - Node config

**Status:** ✓ Multiple configs for different contexts

### ESLint Configuration

**File:** `eslint.config.js`

**Status:** ✓ Modern flat config format

### PostCSS/Tailwind

**Files:**
- `postcss.config.js`
- `tailwind.config.ts`

**Status:** ✓ Properly configured

---

## Recommendations

### Immediate (Safe)

1. **Move @testing-library/dom to devDependencies**
   ```bash
   npm uninstall @testing-library/dom
   npm install -D @testing-library/dom
   ```

2. **Verify Drizzle usage**
   - If Appwrite-only, remove drizzle dependencies
   - If still used, keep but document why

3. **Update FRONTEND_URL in workflow**
   ```yaml
   FRONTEND_URL: https://wiseresume.app
   ```

4. **Remove DEVKIT_PASSWORD from workflow**
   - No longer used per CHANGELOG

### Medium Priority

1. **Run depcheck to find unused dependencies**
   ```bash
   npx depcheck
   ```

2. **Run npm audit (read-only)**
   ```bash
   npm audit --omit=dev
   ```

3. **Add explicit permissions to workflows**

### Low Priority

1. **Remove Replit config if unused**
2. **Clean up scripts folder** (some may be legacy)

---

## Commands for Validation

```bash
# Check for unused dependencies
npx depcheck

# Check for security vulnerabilities (read-only)
npm audit --omit=dev

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Build verification
npm run build

# Test verification
npm run test
```

---

## Summary

| Category | Issues | Priority |
|----------|--------|----------|
| Unused dependencies | 3-5 potential | Medium |
| Workflow issues | 2 (FRONTEND_URL, DEVKIT_PASSWORD) | High |
| Security audit | Unknown (not run) | High |
| Dev dependency categorization | 2 packages | Low |
| Drizzle/PostgreSQL | Verify usage | Medium |
