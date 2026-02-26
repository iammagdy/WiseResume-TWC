

## Analysis: Emergent LLM Key + Custom Supabase Setup

### Current State

Your `aiClient.ts` is properly structured with a 3-tier key resolution:
1. User's BYOK Gemini key (from DB)
2. Global `GEMINI_API_KEY` env var
3. `EMERGENT_LLM_KEY` env var (Emergent Universal)

However, **neither `GEMINI_API_KEY` nor `EMERGENT_LLM_KEY` exists in your secrets**, so all AI calls will fail unless a user has their own BYOK key saved.

### Required Fixes

#### 1. Add `EMERGENT_LLM_KEY` Secret
Add the Emergent Universal API key as a secret so edge functions can access it. The key from your setup doc: `sk-emergent-2113715Ec2b2713676`

#### 2. Fix Build Error: `SignupForm.tsx`
The framer-motion `ease` property needs a typed value (`"easeOut" as const`) instead of a plain string to satisfy TypeScript.

#### 3. Fix Build Error: `PrivacySection.tsx`
The `BiometryTypeString` type comparison with `"face"` needs a type assertion or the type definition needs updating.

#### 4. Fix Edge Function Type Error
The `deno.lock` or an import referencing `npm:openai@^4.52.5` is causing a resolution failure. This likely comes from `@supabase/functions-js` internals. Removing or regenerating `deno.lock` should fix it.

### No Changes Needed
- `aiClient.ts` -- already correctly implements Emergent fallback
- `supabase/config.toml` -- all functions correctly configured
- AI Settings UI (`AISettingsSheet.tsx`) -- properly shows WiseResume AI vs Gemini BYOK options
- The `.env` and `client.ts` files are auto-managed by Lovable Cloud

### Technical Details

**Files to modify:**
- `src/components/auth/SignupForm.tsx` -- cast `ease` to literal type
- `src/components/settings/sections/PrivacySection.tsx` -- fix biometric type comparison
- Possibly remove `deno.lock` if it exists

**Secret to add:**
- `EMERGENT_LLM_KEY` = your Emergent API key

