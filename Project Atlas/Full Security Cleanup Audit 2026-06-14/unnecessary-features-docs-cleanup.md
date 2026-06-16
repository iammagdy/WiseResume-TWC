# Unnecessary Features & Documentation Cleanup Audit - WiseResume 2026-06-14

**Scope:** Documentation, unused features, legacy code, stale files  
**Classification:** KEEP / REMOVE CANDIDATE / NEEDS PRODUCT DECISION / DANGEROUS TO REMOVE / STALE DOC / DUPLICATE DOC / LEGACY BUT STILL REFERENCED

---

## Classification Key

| Status | Meaning | Action |
|--------|---------|--------|
| **KEEP** | Active and needed | None |
| **REMOVE CANDIDATE** | Appears unused, safe to remove | Review and delete |
| **NEEDS PRODUCT DECISION** | Unclear if still needed | Product owner decides |
| **DANGEROUS TO REMOVE** | Referenced but may be broken | Careful analysis needed |
| **STALE DOC** | Outdated documentation | Update or archive |
| **DUPLICATE DOC** | Redundant with other docs | Consolidate |
| **LEGACY BUT STILL REFERENCED** | Old but actively used | Keep, document technical debt |

---

## File-by-File Analysis

### Project Atlas Documentation

| File | Classification | Rationale |
|------|----------------|-----------|
| `README.md` | KEEP | Main entry point |
| `CHANGELOG.md` | STALE DOC (partial) | 363KB, very long; archive pre-2026 entries? |
| `MASTER_HANDOVER_2026.md` | KEEP | Active handover document |
| `RULES.md` | KEEP | Current governance |
| `GOVERNANCE.md` | KEEP | If exists |
| `DEPLOYMENT_GUIDE.md` | KEEP | Active operations doc |
| `SOURCE_OF_TRUTH_MAP.md` | KEEP | Architecture reference |

### docs/ Directory

| File/Folder | Classification | Rationale |
|-------------|----------------|-----------|
| `ai_features_design.md` | STALE DOC | May predate current AI architecture |
| `backend.md` | STALE DOC | Verify if matches Appwrite architecture |
| `db-unused-index-analysis.md` | KEEP | Recent analysis, useful |
| `audits/` | KEEP | Historical audit records |
| `issues/` | STALE DOC | May contain resolved issues |
| `landing/` | STALE DOC | Landing page audits may be outdated |
| `ops/` | KEEP | Operational runbooks |
| `openrouter2-deployment.md` | LEGACY BUT STILL REFERENCED | Provider migration history |
| `project-atlas/` | DUPLICATE DOC | Should consolidate to Project Atlas/ |

### Root Documentation

| File | Classification | Rationale |
|------|----------------|-----------|
| `README.md` | KEEP | Main project README |
| `API_CONFIGURATION.md` | VERIFY | Check if current |
| `ARCHITECTURE.md` | VERIFY | Check if current |
| `CONTRIBUTING.md` | KEEP | Contribution guidelines |
| `SECURITY_FIXES_SUMMARY.md` | STALE DOC | May be historical |
| `AI_TOOLS_AUDIT_2026.md` | STALE DOC | May be superseded by CHANGELOG |
| `Deploy.bat` | KEEP | Windows deployment script |
| `replit.md` | REMOVE CANDIDATE | If no longer using Replit |
| `replit.nix` | REMOVE CANDIDATE | Replit configuration |

---

## Cleanup Candidates by Category

### Empty/Legacy Folders

| Path | Classification | Action |
|------|----------------|--------|
| `appwrite-hubs/revenuecat-webhook/` | REMOVE CANDIDATE | Empty (0 items), RevenueCat removed |

### Mobile App Code

| Path | Classification | Action |
|------|----------------|--------|
| `mobile/` | NEEDS PRODUCT DECISION | Out of scope per RULES.md but code exists |

**Note:** RULES.md states "Mobile: still legacy and out of scope unless explicitly targeted."

**Options:**
1. Keep for future mobile development
2. Move to archive branch
3. Delete if definitely abandoned

### Legacy Provider References

| Category | Count | Classification | Action |
|----------|-------|----------------|--------|
| Supabase references | 167 | LEGACY BUT STILL REFERENCED | Update test mocks gradually |
| Kinde references | ~20 | LEGACY BUT STILL REFERENCED | Update error messages |
| RevenueCat | 0 | REMOVED | Already cleaned |

### Stale Design Documents

| Path | Classification | Action |
|------|----------------|--------|
| `Project Atlas/design-system/` | VERIFY | Check if actively used |
| Old design packages | STALE DOC | Archive if superseded |

---

## Specific Recommendations

### Safe to Remove (No Product Decision Required)

1. **`appwrite-hubs/revenuecat-webhook/` folder**
   - Empty directory
   - RevenueCat removed per CHANGELOG 2026-05-27
   - **Action:** Delete folder

2. **Replit configuration files (if confirmed unused)**
   - `replit.md`
   - `replit.nix`
   - `.replit`
   - **Action:** Delete if Replit no longer used

3. **Stale Git workflow references**
   - `DEVKIT_PASSWORD` in deploy-appwrite-hubs.yml (no longer used)
   - **Action:** Remove from workflow

### Needs Product Decision

1. **Mobile app code**
   - Entire `mobile/` directory
   - Dependencies in package.json
   - **Decision needed:** Is mobile app discontinued?

2. **CHANGELOG.md size**
   - 363KB, 1911 lines
   - **Decision needed:** Archive pre-2026 entries to separate file?

3. **Old design system files**
   - **Decision needed:** Keep for reference or archive?

### Should Keep (Legacy But Referenced)

1. **Supabase references in tests**
   - Mock files reference Supabase
   - Gradually update to Appwrite patterns
   - **Action:** Create migration tasks, don't bulk delete

2. **`resume.thewise.cloud` domain references**
   - Backward compatibility required
   - DOMAIN_MAP includes legacy domain
   - **Action:** Keep for existing shared links

### Consolidation Opportunities

1. **docs/project-atlas/ → Project Atlas/**
   - Duplicate documentation tree
   - **Action:** Move contents to canonical Project Atlas/

2. **Multiple audit files**
   - Consider archiving old audits to `Project Atlas/archives/`

---

## WiseHire Status

**Finding:** WiseHire code exists in codebase

| Component | Status | Action |
|-----------|--------|--------|
| `src/components/wisehire/` | KEEP | Active component |
| `src/hooks/wisehire/` | KEEP | Active hooks |
| `appwrite-hubs/wisehire-gateway/` | KEEP | Active function |
| WiseHire pages | KEEP | Part of product |

**Note:** Per user requirements, do not recommend deletion of WiseHire files unless clearly isolated and unused. Current analysis shows WiseHire is integrated and referenced.

---

## Documentation Quality Issues

### Inconsistent Locations

| Issue | Example | Recommended Fix |
|-------|---------|-----------------|
| Atlas docs in two places | `Project Atlas/` and `docs/project-atlas/` | Consolidate to `Project Atlas/` |
| Root-level audit files | `AI_TOOLS_AUDIT_2026.md` | Move to `Project Atlas/audits/` |
| Changelog size | 363KB | Split to `CHANGELOG.md` + `CHANGELOG_ARCHIVE.md` |

### Missing Documentation

| Gap | Impact | Priority |
|-----|--------|----------|
| Security incident response | High | Create runbook |
| Key rotation procedures | High | Document |
| Disaster recovery | Medium | Create plan |

---

## Risk Assessment for Cleanup

| Action | Risk Level | Mitigation |
|--------|------------|------------|
| Remove revenuecat-webhook | None | Folder is empty |
| Remove mobile/ code | Medium | Verify not needed first |
| Archive old CHANGELOG | Low | Keep backup |
| Consolidate docs | Low | Move, don't delete |
| Update test mocks | Low | Run tests after |

---

## Summary Table

| Category | Count | Recommended Action |
|----------|-------|-------------------|
| REMOVE CANDIDATE | 3 | Safe to delete |
| NEEDS PRODUCT DECISION | 3 | Owner decision required |
| STALE DOC | 5 | Archive or update |
| DUPLICATE DOC | 2 | Consolidate |
| LEGACY BUT STILL REFERENCED | 2 | Keep, plan migration |
| DANGEROUS TO REMOVE | 0 | None identified |
| KEEP | ~50 | No action |
