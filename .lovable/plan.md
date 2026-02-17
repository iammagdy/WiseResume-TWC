

## Fix 3 Security Issues: API Key Storage, ESM Compatibility, and Key Transmission

### Overview
Three changes to improve security and compatibility of the AI provider system.

---

### Issue 1: Fix `require()` in `geminiKeyValidator.ts`

**Problem**: Line 135 uses `require('@/store/settingsStore')` which is a CommonJS pattern incompatible with the ESM/Vite build system. This function (`getGeminiKeyForRequest`) is also never imported anywhere -- it's a dead code duplicate of `getUserGeminiKey()` in `aiProvider.ts`.

**Fix**: Delete the `getGeminiKeyForRequest` function entirely (lines 130-142). It's unused dead code with a broken `require()` call. The existing `getUserGeminiKey()` in `aiProvider.ts` already does the same thing correctly.

**File**: `src/lib/geminiKeyValidator.ts`

---

### Issue 2: Encrypt API Keys in localStorage

**Problem**: `geminiApiKey` and `elevenlabsApiKey` are stored as plaintext in the `wiseresume-settings` localStorage entry via Zustand persist. Anyone with access to the browser can read them.

**Fix**: Add a lightweight obfuscation layer using the Web Crypto API (AES-GCM) with a device-derived key. This won't stop a determined attacker with full browser access, but it prevents casual exposure from DevTools browsing.

**Files**:
- **New file**: `src/lib/cryptoStore.ts` -- exports `encryptValue(plaintext)` and `decryptValue(ciphertext)` using `crypto.subtle` with a stable derived key from a device fingerprint stored separately.
- **Modified**: `src/store/settingsStore.ts` -- wrap `geminiApiKey` and `elevenlabsApiKey` setters/getters with encrypt/decrypt. Use a custom Zustand `storage` adapter in the `persist` config that transparently handles encryption for sensitive fields.

---

### Issue 3: Secure Gemini Key Transmission

**Problem**: The user's Gemini API key is sent in the request body (`userGeminiKey`) to every edge function call from 22 client-side call sites. While transmitted over HTTPS, the key is visible in browser DevTools network tab request payloads.

**Fix**: Store the user's Gemini key server-side in the database (encrypted), and have edge functions retrieve it from there instead of receiving it in the request body.

**Files**:
- **Database migration**: Create a `user_api_keys` table with columns `user_id (uuid, FK)`, `provider (text)`, `encrypted_key (text)`, `key_tier (text)`, `created_at`, `updated_at`. Enable RLS so users can only access their own keys.
- **New edge function**: `supabase/functions/manage-api-keys/index.ts` -- POST to save a key, GET to retrieve, DELETE to remove. Encrypts with a server-side secret before storing.
- **Modified**: `supabase/functions/_shared/aiClient.ts` -- add a `getUserKeyFromDB(userId, provider)` helper that edge functions can call instead of receiving the key in the body.
- **Modified**: All 22 client-side files that pass `userGeminiKey` -- remove the key from the request body. Edge functions will fetch it from the DB using the authenticated user's JWT.
- **Modified**: `src/store/settingsStore.ts` -- remove `geminiApiKey` from persisted state. Store only `aiProvider`, `geminiKeyTier`, and `geminiKeyValidated` locally.
- **Modified**: `src/components/settings/AISettingsSheet.tsx` (or wherever the key is entered) -- call the new `manage-api-keys` edge function to save the key server-side.

---

### Technical Details: Affected Client Files (Issue 3)

These 22 files currently pass `userGeminiKey` in request bodies and will be updated to remove that parameter:

1. `src/lib/agenticChat.ts`
2. `src/lib/aiAnalysis.ts`
3. `src/lib/aiTailor.ts`
4. `src/lib/pdfParser.ts`
5. `src/hooks/useVoiceInterview.ts`
6. `src/hooks/useAIEnhance.ts`
7. `src/hooks/useProofread.ts`
8. `src/hooks/useCareerAssessment.ts`
9. `src/hooks/useResumeScore.ts`
10. `src/hooks/useCoverLetters.ts`
11. `src/hooks/useResignationLetters.ts`
12. `src/pages/CareerPage.tsx`
13. `src/pages/ResignationLetterNewPage.tsx`
14. `src/pages/CoverLetterNewPage.tsx`
15. `src/components/editor/ai/AIEnhanceSheet.tsx`
16. `src/components/editor/ai/RecruiterSimSheet.tsx`
17. `src/components/editor/ai/AIDetectorSheet.tsx`
18. `src/components/editor/ai/OnePageWizardSheet.tsx`
19. `src/components/editor/ai/LinkedInOptimizerSheet.tsx`
20. `src/components/editor/GapExplainerSheet.tsx`
21. `src/components/editor/GapFillerSheet.tsx`
22. `src/components/editor/tailor/CoverLetterGenerator.tsx`

### Execution Order
1. Fix Issue 1 (dead code removal) -- immediate, no dependencies
2. Create `user_api_keys` table with RLS (Issue 3 prerequisite)
3. Create `manage-api-keys` edge function (Issue 3)
4. Update `_shared/aiClient.ts` to fetch keys from DB (Issue 3)
5. Update all 22 client files to stop sending `userGeminiKey` (Issue 3)
6. Update settings store and AI settings UI to save keys server-side (Issues 2 and 3)
7. Issue 2 becomes largely moot since keys are no longer stored in localStorage

