# 05 - Rollback and Safety

## Emergency Rollback
If a fatal error occurs in the Appwrite integration during Phase 2 or 3:
1. Revert the `src/lib/appwrite.ts` toggle to 'OFF'.
2. The app will immediately fall back to Supabase/Kinde.

## Data Safety
- Never delete data from Supabase until Phase 5 is officially completed and signed off.
- Perform weekly backups of both Supabase and Appwrite during the migration.
