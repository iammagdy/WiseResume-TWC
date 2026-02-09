
# AI Provider Management System with Gemini API Fallback

## Overview

This plan implements a complete AI provider management system that allows users to bring their own Google Gemini API key as an alternative to the built-in Lovable AI gateway. The system includes automatic tier detection, smart rate limiting, and a dedicated AI settings page accessible from a new bottom navigation tab.

## Architecture Summary

```text
+-------------------+       +-------------------+       +-------------------+
|  Frontend App     |       |  Edge Functions   |       |  AI Gateways      |
|                   |       |                   |       |                   |
|  Settings Store   | ----> |  Shared AI Client | ----> |  Lovable Gateway  |
|  (Provider Choice)|       |  (Routing Logic)  |       |  OR               |
|                   |       |                   |       |  Google Direct    |
+-------------------+       +-------------------+       +-------------------+
```

## Implementation Details

### Phase 1: Extend Settings Store

**File: `src/store/settingsStore.ts`**

Add new fields for AI provider configuration:

```typescript
// New types
export type AIProvider = 'lovable' | 'gemini';
export type GeminiKeyTier = 'free' | 'paid' | 'unknown';

// New state fields
interface SettingsState {
  // ... existing fields ...
  
  // AI Provider Settings
  aiProvider: AIProvider;
  geminiApiKey: string;
  geminiKeyTier: GeminiKeyTier;
  geminiKeyValidated: boolean;
  geminiDailyUsage: { date: string; count: number };
  
  // Actions
  setAIProvider: (provider: AIProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiKeyTier: (tier: GeminiKeyTier) => void;
  setGeminiKeyValidated: (validated: boolean) => void;
  incrementGeminiDailyUsage: () => void;
  resetGeminiDailyUsage: () => void;
}
```

**Default Values:**
- `aiProvider: 'lovable'` - Use built-in gateway by default
- `geminiApiKey: ''` - No key initially
- `geminiKeyTier: 'unknown'`
- `geminiKeyValidated: false`
- `geminiDailyUsage: { date: '', count: 0 }`

### Phase 2: Create Gemini Key Validator Utility

**New File: `src/lib/geminiKeyValidator.ts`**

This module handles key validation and tier detection by calling Google's API directly:

```typescript
interface GeminiKeyValidationResult {
  isValid: boolean;
  tier: 'free' | 'paid' | 'unknown';
  availableModels: string[];
  error?: string;
}

export async function validateGeminiKey(apiKey: string): Promise<GeminiKeyValidationResult> {
  // 1. Call https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}
  //    to verify key is valid and get available models
  
  // 2. Make a minimal test request to detect tier from rate limit headers
  //    Free tier: 2-15 RPM, Paid: 1000+ RPM
  //    Check x-ratelimit-limit-requests header
  
  // 3. Return validation result with tier and models
}
```

**Tier Detection Logic:**
- Free tier keys have very low RPM limits (2-15 depending on model)
- Paid tier keys show limits of 1000+ RPM
- Extract from `x-ratelimit-limit-requests` response header

### Phase 3: Create Shared AI Client for Edge Functions

**New File: `supabase/functions/_shared/aiClient.ts`**

Centralized AI routing logic used by all edge functions:

```typescript
interface AICallOptions {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  userGeminiKey?: string;
}

interface AIResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { model, messages, temperature = 0.7, maxTokens, userGeminiKey } = options;
  
  // Determine which gateway to use
  if (userGeminiKey) {
    // Call Google's OpenAI-compatible endpoint directly
    // https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
    // Strip "google/" prefix from model name
    // Map unsupported models to closest available
  } else {
    // Use Lovable gateway with LOVABLE_API_KEY
    // https://ai.gateway.lovable.dev/v1/chat/completions
  }
}

// Model mapping for direct Gemini calls
const MODEL_MAPPING: Record<string, string> = {
  'google/gemini-2.5-flash': 'gemini-2.5-flash',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
  'google/gemini-3-flash-preview': 'gemini-2.0-flash', // Fallback
  // ... etc
};
```

### Phase 4: Update All Edge Functions

All 15 AI-calling edge functions need modification to accept an optional `userGeminiKey` parameter:

| Function | Model Used | Changes Required |
|----------|------------|------------------|
| tailor-resume | gemini-2.5-pro | Use shared aiClient |
| analyze-resume | gemini-2.5-flash | Use shared aiClient |
| enhance-section | gemini-2.5-flash | Use shared aiClient |
| generate-cover-letter | gemini-2.5-flash | Use shared aiClient |
| career-path-advisor | gemini-2.5-flash | Use shared aiClient |
| detect-and-humanize | gemini-3-flash | Use shared aiClient |
| explain-gap | gemini-3-flash | Use shared aiClient |
| interview-chat | gemini-2.5-flash | Use shared aiClient |
| one-page-optimizer | gemini-2.5-flash | Use shared aiClient |
| optimize-for-linkedin | gemini-2.5-flash | Use shared aiClient |
| parse-job-url | gemini-2.5-flash | Use shared aiClient |
| parse-linkedin | gemini-2.5-flash | Use shared aiClient |
| parse-resume | gemini-2.5-flash | Use shared aiClient |
| recruiter-simulation | gemini-2.5-flash | Use shared aiClient |
| generate-headshot | Image model | Special handling |

**Pattern for each edge function:**

```typescript
// Extract user key from request body
const { userGeminiKey, ...otherParams } = await req.json();

// Use shared AI client instead of direct fetch
const aiResponse = await callAI({
  model: 'google/gemini-2.5-flash',
  messages: [...],
  userGeminiKey,
});
```

### Phase 5: Update Frontend Service Layer

Modify all frontend modules that call edge functions to include the Gemini key when configured:

**Files to update:**
- `src/lib/aiTailor.ts` - tailorResume, parseJobUrl, generateCoverLetter
- `src/lib/aiAnalysis.ts` - analyzeResume
- `src/hooks/useAIEnhance.ts` - enhance function
- Any sheet components that invoke functions directly

**Pattern:**

```typescript
import { useSettingsStore } from '@/store/settingsStore';

// In each function:
const { aiProvider, geminiApiKey } = useSettingsStore.getState();
const userGeminiKey = aiProvider === 'gemini' && geminiApiKey ? geminiApiKey : undefined;

const response = await fetch(`${SUPABASE_URL}/functions/v1/tailor-resume`, {
  method: 'POST',
  body: JSON.stringify({ 
    resume, 
    jobDescription,
    userGeminiKey, // Only included when using Gemini
  }),
});
```

### Phase 6: Implement Smart Rate Limiting

**New File: `src/lib/rateLimiter.ts`**

Create a client-side rate limiter with provider-aware limits:

```typescript
// Rate limit profiles by provider and tier
const RATE_LIMITS = {
  lovable: {
    tailor: { rpm: 5, rpd: Infinity },
    analyze: { rpm: 10, rpd: Infinity },
    enhance: { rpm: 10, rpd: Infinity },
    // ... etc
  },
  gemini_free: {
    tailor: { rpm: 2, rpd: 50 },  // Very conservative for free tier
    analyze: { rpm: 5, rpd: 100 },
    enhance: { rpm: 5, rpd: 100 },
    // ... etc
  },
  gemini_paid: {
    tailor: { rpm: 60, rpd: Infinity },
    analyze: { rpm: 60, rpd: Infinity },
    enhance: { rpm: 60, rpd: Infinity },
    // ... etc
  },
};

export function checkRateLimit(feature: string): { allowed: boolean; waitSeconds: number } {
  const { aiProvider, geminiKeyTier, geminiDailyUsage } = useSettingsStore.getState();
  const profile = aiProvider === 'lovable' ? 'lovable' 
    : geminiKeyTier === 'paid' ? 'gemini_paid' : 'gemini_free';
  
  // Check RPM (sliding window in memory)
  // Check RPD for free tier (persisted in store)
  // Reset daily usage at midnight Pacific time
}
```

### Phase 7: Build AI Settings Page

**New File: `src/pages/AIPage.tsx`**

A dedicated page for all AI-related configuration:

```text
+----------------------------------------------------------+
|  AI Settings                                              |
+----------------------------------------------------------+
|                                                           |
|  AI PROVIDER                                              |
|  +-------------------------------------------------+      |
|  | ○ WiseResume AI (Default)                       |      |
|  |   Free tier included, no setup required         |      |
|  |                                                 |      |
|  | ● Your Own Gemini API Key                       |      |
|  |   Use your Google AI Studio key                 |      |
|  +-------------------------------------------------+      |
|                                                           |
|  GEMINI API KEY                            [Validated ✓]  |
|  +-------------------------------------------------+      |
|  | ••••••••••••••••••XXXX    [Validate] [Clear]    |      |
|  +-------------------------------------------------+      |
|  | Tier: Paid | Models: 12 available               |      |
|  | Get a key at: ai.google.dev/aistudio            |      |
|  +-------------------------------------------------+      |
|                                                           |
|  USAGE THIS SESSION                                       |
|  +-------------------------------------------------+      |
|  | Requests: 23 | Remaining: 977 RPM               |      |
|  | Daily (free tier only): 45/500                  |      |
|  +-------------------------------------------------+      |
|                                                           |
|  VOICE INTEGRATION                                        |
|  +-------------------------------------------------+      |
|  | ElevenLabs API Key                    [•••••→]  |      |
|  | For speech-to-text in interviews               |      |
|  +-------------------------------------------------+      |
|                                                           |
|  TIPS                                                     |
|  +-------------------------------------------------+      |
|  | • Free tier has strict daily limits (50-500)    |      |
|  | • Paid tier unlocks faster responses            |      |
|  | • Keys are stored locally, never sent to our    |      |
|  |   servers except to Google directly             |      |
|  +-------------------------------------------------+      |
+----------------------------------------------------------+
```

**Key UI Components:**
- Radio group for provider selection
- API key input with validation button and status badge
- Tier detection badge (Free/Paid/Unknown)
- Usage statistics card
- Link to Google AI Studio
- Move ElevenLabs key config here from Settings

### Phase 8: Add AI Tab to Bottom Navigation

**File: `src/components/layout/BottomTabBar.tsx`**

Add new tab entry:

```typescript
import { Brain } from 'lucide-react'; // or Bot, Cpu, Sparkles

const tabs: TabItem[] = [
  { path: '/dashboard', icon: Home, label: 'Home', matchPaths: ['/dashboard'] },
  { path: '/editor', icon: FileText, label: 'Editor', matchPaths: ['/editor', '/preview'] },
  { path: '/interview', icon: Mic, label: 'Interview', matchPaths: ['/interview'] },
  { path: '/ai', icon: Brain, label: 'AI', matchPaths: ['/ai'] },  // NEW
  { path: '/settings', icon: Settings, label: 'Settings', matchPaths: ['/settings'] },
];
```

**Note:** This removes the "New" (upload) tab. Upload can be accessed from the Dashboard page instead, or via a floating action button.

**File: `src/App.tsx`**

Add route for AI page:

```typescript
const AIPage = lazy(() => import("./pages/AIPage"));

// Inside AppShell routes:
<Route path="/ai" element={
  <Suspense fallback={<AISkeleton />}>
    <AIPage />
  </Suspense>
} />
```

**File: `src/components/layout/PageSkeletons.tsx`**

Add loading skeleton:

```typescript
export function AISkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
        <div className="h-7 w-28 bg-muted rounded" />
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
```

### Phase 9: Error Handling and Fallback Logic

Implement comprehensive error handling for both providers:

**Edge Function Error Responses:**

| Error | Lovable Gateway | Gemini Direct |
|-------|-----------------|---------------|
| Rate limit | 429 + generic message | 429 + tier-specific message |
| Invalid key | N/A | 401 + "Invalid API key" |
| Credits exhausted | 402 | 429 + "Daily quota exceeded" |
| Network error | 500 | 500 |

**Frontend Error Handling:**

```typescript
// In catch blocks:
if (error.message.includes('Daily quota exceeded')) {
  toast.error('Free tier daily limit reached. Try again tomorrow or use a paid key.');
} else if (error.message.includes('Invalid API key')) {
  toast.error('Your Gemini API key is invalid. Please check your settings.');
  // Optionally auto-switch back to Lovable
} else if (error.message.includes('Rate limit')) {
  toast.error('Too many requests. Please wait a moment.');
}
```

**Key Principle:** Never silently switch providers - always respect user's explicit choice.

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/store/settingsStore.ts` | Modify | Add AI provider fields |
| `src/lib/geminiKeyValidator.ts` | Create | Key validation + tier detection |
| `src/lib/rateLimiter.ts` | Create | Client-side rate limiting |
| `supabase/functions/_shared/aiClient.ts` | Create | Shared AI routing logic |
| `supabase/functions/*/index.ts` (15 files) | Modify | Use shared aiClient |
| `src/lib/aiTailor.ts` | Modify | Pass userGeminiKey |
| `src/lib/aiAnalysis.ts` | Modify | Pass userGeminiKey |
| `src/hooks/useAIEnhance.ts` | Modify | Pass userGeminiKey |
| `src/pages/AIPage.tsx` | Create | AI settings page |
| `src/components/layout/BottomTabBar.tsx` | Modify | Add AI tab |
| `src/components/layout/PageSkeletons.tsx` | Modify | Add AISkeleton |
| `src/App.tsx` | Modify | Add /ai route |
| `supabase/config.toml` | Keep unchanged | No new functions needed |

## Benefits

1. **User Choice**: Users can bring their own API key if desired
2. **Cost Savings**: Free tier users can use their own Gemini free key to bypass Lovable quotas
3. **No Breaking Changes**: Existing flow works unchanged (Lovable gateway remains default)
4. **Transparent Tier Detection**: Users know immediately if their key is free or paid
5. **Smart Rate Limiting**: Prevents users from hitting Google's limits unexpectedly
6. **Centralized Logic**: Shared aiClient makes future provider additions easy
