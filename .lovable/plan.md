

## Production-Ready APK Build with Full AI Support

### Problem Summary
The build output you see is actually **successful** -- those are just warnings, not errors. However, there are real issues that would cause problems in the installed APK:

1. **Direct `import.meta.env.VITE_SUPABASE_URL` usage without fallback** in 3 files -- these will be `undefined` in the APK if env vars aren't baked in at build time
2. **GitHub Actions workflow missing env vars** -- the `npm run build` step doesn't inject `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, so the built assets may not have them
3. **Capacitor config uses wrong `appId`** -- currently `com.wiseresume.app` instead of the Lovable-assigned `app.lovable.1d3d9943c1ba4253b6336b1457b9b330`
4. **Capacitor `appName`** -- currently "Wise Resume", should be updated to "Wise AI" to match the new branding
5. **Gemini API key flow** works correctly since it's stored in Zustand (persisted to localStorage) and passed through edge functions via `userGeminiKey` body param -- no changes needed there

### What Will Be Changed

#### 1. Fix direct `fetch()` calls to use `SUPABASE_URL` from safeClient (3 files)
Replace raw `import.meta.env.VITE_SUPABASE_URL` with the imported constant from `safeClient.ts` which has hardcoded fallbacks. This ensures edge function calls work even without env vars.

- `src/pages/ResignationLetterNewPage.tsx` -- use `SUPABASE_URL` from safeClient
- `src/pages/ResignationLetterEditPage.tsx` -- same fix  
- `src/components/applications/AddApplicationSheet.tsx` -- same fix, plus use `SUPABASE_PUBLISHABLE_KEY` fallback

#### 2. Update GitHub Actions workflow to inject env vars at build time
Add environment variables to the `Build web app` step so Vite bakes them into the bundle:

```text
env:
  VITE_SUPABASE_URL: https://hjnnamwgztlhzkeuufln.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY: eyJhbGci...
```

#### 3. Update Capacitor config
- Change `appName` from "Wise Resume" to "Wise AI" to match rebranding

#### 4. Fix the Tailwind warning
Replace the ambiguous class `duration-[1.2s]` with `duration-[1200ms]` to silence the build warning.

### AI Features on Mobile -- Verification

The AI pipeline is already mobile-ready:
- **Default path (Lovable AI)**: Client calls `supabase.functions.invoke()` which goes to edge functions that use `LOVABLE_API_KEY` server-side -- works from any origin
- **Custom Gemini key path**: Key is stored in Zustand (localStorage), passed as `userGeminiKey` in request body to edge functions, which call Google's API directly server-side -- also works from any origin
- **CORS**: The shared `cors.ts` already handles native app origins (`null` origin returns `*`)

No changes needed for the AI logic itself.

### Technical Details

**Files to modify:**
1. `src/pages/ResignationLetterNewPage.tsx` -- import `SUPABASE_URL` from safeClient, replace `import.meta.env.VITE_SUPABASE_URL`
2. `src/pages/ResignationLetterEditPage.tsx` -- same
3. `src/components/applications/AddApplicationSheet.tsx` -- same, plus `SUPABASE_PUBLISHABLE_KEY`
4. `.github/workflows/build-apk.yml` -- add env vars to build step
5. `capacitor.config.ts` -- update `appName`
6. Search and fix `duration-[1.2s]` class usage

