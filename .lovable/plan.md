

# Fix: Screenshots Gallery "SUPABASE_URL environment variable is required" Error

## Root Cause
`src/pages/ScreenshotsGalleryPage.tsx` imports from `@/integrations/supabase/client` which validates environment variables at runtime and throws. The rest of the app uses `@/integrations/supabase/safeClient` which has hardcoded credentials.

## Fix
One-line change in `src/pages/ScreenshotsGalleryPage.tsx`:

Change:
```typescript
import { supabase } from "@/integrations/supabase/client";
```
To:
```typescript
import { supabase } from "@/integrations/supabase/safeClient";
```

No other changes needed.

