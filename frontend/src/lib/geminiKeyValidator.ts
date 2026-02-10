/**
 * Gemini API Key Validator
 * Validates keys and detects tier (free vs paid) by calling Google's API
 */

export interface GeminiKeyValidationResult {
  isValid: boolean;
  tier: 'free' | 'paid' | 'unknown';
  availableModels: string[];
  error?: string;
}

interface ModelListResponse {
  models?: Array<{
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
  }>;
}

/**
 * Validates a Gemini API key and detects its tier
 * Free tier keys have very low RPM limits (2-15), paid tier keys have 1000+ RPM
 */
export async function validateGeminiKey(apiKey: string): Promise<GeminiKeyValidationResult> {
  if (!apiKey || apiKey.trim().length < 10) {
    return {
      isValid: false,
      tier: 'unknown',
      availableModels: [],
      error: 'Invalid API key format',
    };
  }

  try {
    // Step 1: Validate key by fetching available models
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );

    if (!modelsResponse.ok) {
      if (modelsResponse.status === 400 || modelsResponse.status === 403) {
        return {
          isValid: false,
          tier: 'unknown',
          availableModels: [],
          error: 'Invalid API key',
        };
      }
      return {
        isValid: false,
        tier: 'unknown',
        availableModels: [],
        error: `Validation failed: ${modelsResponse.status}`,
      };
    }

    const modelsData: ModelListResponse = await modelsResponse.json();
    const availableModels = modelsData.models
      ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map(m => m.name.replace('models/', '')) || [];

    if (availableModels.length === 0) {
      return {
        isValid: false,
        tier: 'unknown',
        availableModels: [],
        error: 'No compatible models available',
      };
    }

    // Step 2: Detect tier by making a minimal request and checking rate limit headers
    // We use the smallest possible request to minimize quota usage
    const tierResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      }
    );

    // Check rate limit headers to determine tier
    // Free tier: x-ratelimit-limit-requests typically shows 2-15 RPM
    // Paid tier: typically shows 1000+ RPM
    const rateLimitHeader = tierResponse.headers.get('x-ratelimit-limit-requests');
    let tier: 'free' | 'paid' | 'unknown' = 'unknown';

    if (rateLimitHeader) {
      const rpm = parseInt(rateLimitHeader, 10);
      if (!isNaN(rpm)) {
        // Google's free tier has very low limits (2-15 RPM)
        // Paid tier has 1000+ RPM
        tier = rpm < 100 ? 'free' : 'paid';
      }
    } else {
      // If no header, try to infer from response behavior
      // Free tier keys often have visible quota information in errors
      if (tierResponse.ok) {
        // Successful request - check if we got a very quick response (paid tier is faster)
        tier = 'unknown'; // Can't determine without headers
      }
    }

    // If we couldn't determine tier from headers, default to free for safety
    if (tier === 'unknown') {
      tier = 'free';
    }

    return {
      isValid: true,
      tier,
      availableModels,
    };
  } catch (error) {
    console.error('Gemini key validation error:', error);
    return {
      isValid: false,
      tier: 'unknown',
      availableModels: [],
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get the user's Gemini key from settings store (if using Gemini provider)
 */
export function getGeminiKeyForRequest(): string | undefined {
  // Import dynamically to avoid circular dependencies
  const { useSettingsStore } = require('@/store/settingsStore');
  const { aiProvider, geminiApiKey } = useSettingsStore.getState();
  
  if (aiProvider === 'gemini' && geminiApiKey) {
    return geminiApiKey;
  }
  return undefined;
}
