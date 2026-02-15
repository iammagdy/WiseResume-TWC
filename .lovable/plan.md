

## Fix: Editor Page Crash ("supabaseUrl is required")

### Root Cause

The recently created `GapFillerSheet.tsx` imports the Supabase client from the wrong file:
- **Current (broken):** `import { supabase } from '@/integrations/supabase/client'`
- **Correct:** `import { supabase } from '@/integrations/supabase/safeClient'`

The `client.ts` file is auto-generated and has no fallback values for missing environment variables, causing it to crash with "supabaseUrl is required." The project uses `safeClient.ts` as a wrapper with hardcoded fallbacks for exactly this reason.

### Fix

**File: `src/components/editor/GapFillerSheet.tsx` (line 10)**

Change the import from:
```typescript
import { supabase } from '@/integrations/supabase/client';
```
to:
```typescript
import { supabase } from '@/integrations/supabase/safeClient';
```

This is a single-line fix. No other files are affected.

