

## Fix: App Stuck on Loading Screen

### Root Cause

The recent Offline Sync Conflict Detection changes in `src/hooks/useOfflineSync.ts` introduced an import from `@/integrations/supabase/client` (the auto-generated file with no fallbacks). This file crashes immediately with "supabaseUrl is required" when environment variables aren't available at module load time.

The rest of the app correctly uses `@/integrations/supabase/safeClient` which has hardcoded fallback values for exactly this scenario.

### Fix

**File: `src/hooks/useOfflineSync.ts`**

Change line 6 from:
```typescript
import { supabase } from '@/integrations/supabase/client';
```
to:
```typescript
import { supabase } from '@/integrations/supabase/safeClient';
```

That is the only change needed. No other files import from the unsafe client.

### Files Changed

- `src/hooks/useOfflineSync.ts` -- fix import to use safeClient

