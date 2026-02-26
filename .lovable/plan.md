

## Configure safeClient.ts for Your Own Supabase Instance

### Overview
Update `safeClient.ts` to use your personal Supabase instance (`jnsfmkzgxsviuthaqlyy.supabase.co`) instead of the Lovable Cloud instance. Since `client.ts` is auto-managed by Lovable Cloud and cannot be edited, `safeClient.ts` is the correct place for this change. All app code already imports from `safeClient.ts`.

### Important Considerations
- **Edge functions** will continue running on Lovable Cloud's backend -- they use `SUPABASE_URL` / `SUPABASE_ANON_KEY` secrets, not `safeClient.ts`
- **Database tables, RLS policies, and functions** must exist on your personal instance for the app to work
- You will need to recreate the full schema (tables, functions, triggers, RLS policies, storage buckets) on your instance

### Changes

**File: `src/integrations/supabase/safeClient.ts`**
- Replace the environment variable reads with hardcoded values pointing to your Supabase instance:
  - URL: `https://jnsfmkzgxsviuthaqlyy.supabase.co`
  - Anon key: your provided anon key
- Keep the same client configuration (persistSession, autoRefreshToken)
- Export `supabaseConfig` and constants as before

### Technical Details

```text
safeClient.ts (before)
+---------------------------------+
| Reads VITE_SUPABASE_URL         |  --> hjnnamwgztlhzkeuufln (Lovable Cloud)
| Reads VITE_SUPABASE_PUBLISHABLE |
+---------------------------------+

safeClient.ts (after)
+---------------------------------+
| Hardcoded URL + anon key        |  --> jnsfmkzgxsviuthaqlyy (your instance)
+---------------------------------+

client.ts (unchanged, auto-managed)
+---------------------------------+
| Still points to Lovable Cloud   |  --> hjnnamwgztlhzkeuufln
+---------------------------------+
```

### Risk: Schema Mismatch
Your personal Supabase instance must have the same tables, RLS policies, database functions, triggers, and storage buckets that the app expects. If they don't exist, you'll get runtime errors. After this change, you may want to run the full schema migration on your instance.

