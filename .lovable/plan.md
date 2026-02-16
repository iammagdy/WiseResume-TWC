

## Fix: AI Features Not Working in the Mobile APK

### The Problem
When your app runs as a native APK built with Capacitor, all AI-powered features (scoring, tailoring, chat, etc.) fail because the backend functions reject requests from the app's origin.

Here's what happens:
1. Your APK loads the app from `http://localhost` (or `capacitor://localhost` on Android)
2. When the app calls a backend function (e.g., score-resume), the browser sends a preflight (OPTIONS) request
3. The backend checks the origin against a list of allowed origins
4. `http://localhost` and `capacitor://localhost` are NOT in that list
5. The backend returns a CORS error, and the browser blocks the actual request
6. The app shows "Scoring failed" because the request never completed

The edge logs confirm this: only OPTIONS requests are logged (200), but zero POST requests ever arrive.

### The Fix (1 file)

**`supabase/functions/_shared/cors.ts`** -- Add Capacitor origins to the allowed list:

```
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost',           // <-- Capacitor Android
  'capacitor://localhost',      // <-- Capacitor iOS
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];
```

This single change will fix ALL AI features (scoring, enhancement, tailoring, chat, interview, cover letter generation, etc.) since they all share this same CORS helper.

### What Won't Change
- No changes to the edge function logic itself
- No changes to the frontend code
- No changes to the Capacitor config or build workflow
- The web version continues working exactly as before

