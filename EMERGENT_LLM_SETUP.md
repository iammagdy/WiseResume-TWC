# Emergent Universal LLM Key Integration

## Overview
WiseResume now supports **Emergent Universal Key** as the default AI provider. This single API key provides access to multiple LLM providers (Gemini, GPT, Claude) through one unified endpoint.

## Key Priority Order
The AI client follows this fallback order:
1. **User's BYOK (Bring Your Own Key)** - If user has added their own Gemini key
2. **Global GEMINI_API_KEY** - Environment variable for Gemini-only access
3. **EMERGENT_LLM_KEY** - Universal key (DEFAULT) - Routes to multiple providers

## Environment Configuration

### Supabase Secrets
Add the following environment variable in your Supabase project:

```bash
EMERGENT_LLM_KEY=sk-emergent-2113715Ec2b2713676
```

**How to add:**
1. Go to Supabase Dashboard → Settings → Edge Functions
2. Add Secret: `EMERGENT_LLM_KEY` = `sk-emergent-2113715Ec2b2713676`
3. Redeploy your edge functions

## Supported Models

### Via Emergent Universal Key
- **Gemini Models:**
  - `gemini-2.5-flash` (default)
  - `gemini-2.5-pro`
  - `gemini-2.5-flash-lite`
  - `gemini-3-flash-preview`
  - `gemini-3-pro-preview`
  - `gemini-2.0-flash`
  - `gemini-2.0-flash-lite`

- **OpenAI Models:**
  - `gpt-5.2`
  - `gpt-5.1`
  - `gpt-4o`

- **Anthropic Models:**
  - `claude-sonnet-4-5`
  - `claude-opus-4-5`

## API Endpoint
- **Emergent Universal:** `https://api.emergent.sh/v1/chat/completions`
- **Direct Gemini:** `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

## Implementation Details

### Modified Files
- `/app/supabase/functions/_shared/aiClient.ts`
  - Added `callEmergentUniversal()` function
  - Modified `callAI()` to support Emergent key fallback
  - Added `mapModelForEmergent()` for model name mapping
  - Added `handleEmergentError()` for error handling

### Usage in Edge Functions
No code changes needed! The existing `callAI()` and `callAIWithRetry()` functions automatically use the Emergent key when available.

Example:
```typescript
const response = await callAIWithRetry({
  model: 'google/gemini-2.5-flash',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  userId: user.id, // Optional: for BYOK lookup
  temperature: 0.7
});
```

## Benefits
1. **Single Key Management** - One key for all LLM providers
2. **Cost Tracking** - Unified billing and usage tracking
3. **Automatic Routing** - Models route to correct provider automatically
4. **No Code Changes** - Existing functions work without modification
5. **Fallback Support** - Gracefully falls back if user keys fail

## Monitoring & Credits
- Monitor usage and add credits at: [Emergent Dashboard](https://emergent.sh)
- Key budget notifications appear in app when balance is low
- Users can still add their own API keys to bypass universal key

## Error Handling
The integration handles:
- `401/403` - Invalid key
- `402` - Payment required (low balance)
- `429` - Rate limiting
- `5xx` - Network/server errors with automatic retry

## Testing
To test the integration:
1. Ensure EMERGENT_LLM_KEY is set in Supabase secrets
2. Remove any GEMINI_API_KEY (to force Emergent usage)
3. Test any AI feature (resume tailoring, analysis, etc.)
4. Check function logs for `[AI] Using Emergent Universal Key` message

---

**Last Updated:** March 2026
**Version:** 2.3.1
