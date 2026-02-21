

# Instrument API Key Lifecycle Events with Audit Entries

## Current State

- **AISettingsSheet.tsx** (Gemini keys): Already logs `logAudit('api_key', 'key_saved', ...)` and `logAudit('api_key', 'key_deleted', ...)` -- no changes needed here.
- **ElevenLabsKeySheet.tsx**: Saves and deletes ElevenLabs keys via `manage-api-keys` but has **zero** audit logging.
- **migrateLocalKeys.ts**: Logs `key_migrated` -- already instrumented.

## What Changes

Add `logAudit` calls to `ElevenLabsKeySheet.tsx` for both the save and delete flows, matching the pattern already established in `AISettingsSheet.tsx`.

## File: `src/components/settings/ElevenLabsKeySheet.tsx`

1. **Import** `logAudit` from `@/lib/auditLogger`
2. **After successful save** (line ~43, after the `if (error) throw` check): add `logAudit('api_key', 'key_saved', { provider: 'elevenlabs' })`
3. **After successful delete** (line ~63, after the `if (error) throw` check): add `logAudit('api_key', 'key_deleted', { provider: 'elevenlabs' })`

That is the only file that needs changes -- two lines of audit logging plus one import.
