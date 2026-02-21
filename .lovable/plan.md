

# Add Audit Logging to Data Export Actions

## Current State

- `DataExportSheet.tsx` has three user actions -- Export All, Export Single, and Import Backup -- but **none** log to the audit trail.
- The `logAudit` utility (`@/lib/auditLogger.ts`) is already used elsewhere (API key saves/deletes, sign-out, data deletion) with the pattern `logAudit(category, action, metadata)`.
- The `exportTailorHistory` call in `TailorHistorySheet.tsx` also lacks audit logging but is out of scope for this change.

## What Changes

### File: `src/components/settings/DataExportSheet.tsx`

1. **Import** `logAudit` from `@/lib/auditLogger`
2. **After successful Export All** (line 51, after `setExportedType('all')`): add `logAudit('account', 'data_exported', { type: 'all', resumeCount: resumes.length })`
3. **After successful Export Single** (line 71, after `setExportedType('single')`): add `logAudit('account', 'data_exported', { type: 'single', resumeId: currentResume.id })`
4. **After successful Import** (line 95, after `toast.success`): add `logAudit('account', 'data_imported', { resumeCount: count })`

Three `logAudit` calls plus one import -- no other files change.

