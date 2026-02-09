import { useSettingsStore } from '@/store/settingsStore';

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const existing = this.requests.get(key) || [];
    const recent = existing.filter((t) => now - t < windowMs);

    if (recent.length >= maxRequests) {
      this.requests.set(key, recent);
      return false;
    }

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }

  getRemainingRequests(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): number {
    const now = Date.now();
    const existing = this.requests.get(key) || [];
    const recent = existing.filter((t) => now - t < windowMs);
    return Math.max(0, maxRequests - recent.length);
  }

  getTimeUntilReset(key: string, windowMs: number = 60000): number {
    const existing = this.requests.get(key) || [];
    if (existing.length === 0) return 0;
    const oldest = Math.min(...existing);
    const resetAt = oldest + windowMs;
    return Math.max(0, resetAt - Date.now());
  }

  clear(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const aiRateLimiter = new RateLimiter();

// Rate limits for Lovable gateway (default)
const LOVABLE_RATE_LIMITS = {
  tailor: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  analyze: { maxRequests: 10, windowMs: 60000, rpd: Infinity },
  coverLetter: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  recruiterSim: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  linkedIn: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  aiDetector: { maxRequests: 10, windowMs: 60000, rpd: Infinity },
  onePage: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  enhance: { maxRequests: 10, windowMs: 60000, rpd: Infinity },
  careerPath: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  chat: { maxRequests: 20, windowMs: 60000, rpd: Infinity },
  gapExplainer: { maxRequests: 5, windowMs: 60000, rpd: Infinity },
  interview: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
} as const;

// Rate limits for Gemini free tier (very conservative)
const GEMINI_FREE_RATE_LIMITS = {
  tailor: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  analyze: { maxRequests: 3, windowMs: 60000, rpd: 100 },
  coverLetter: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  recruiterSim: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  linkedIn: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  aiDetector: { maxRequests: 3, windowMs: 60000, rpd: 100 },
  onePage: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  enhance: { maxRequests: 5, windowMs: 60000, rpd: 150 },
  careerPath: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  chat: { maxRequests: 10, windowMs: 60000, rpd: 200 },
  gapExplainer: { maxRequests: 2, windowMs: 60000, rpd: 50 },
  interview: { maxRequests: 10, windowMs: 60000, rpd: 200 },
} as const;

// Rate limits for Gemini paid tier (generous)
const GEMINI_PAID_RATE_LIMITS = {
  tailor: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  analyze: { maxRequests: 60, windowMs: 60000, rpd: Infinity },
  coverLetter: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  recruiterSim: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  linkedIn: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  aiDetector: { maxRequests: 60, windowMs: 60000, rpd: Infinity },
  onePage: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  enhance: { maxRequests: 60, windowMs: 60000, rpd: Infinity },
  careerPath: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  chat: { maxRequests: 100, windowMs: 60000, rpd: Infinity },
  gapExplainer: { maxRequests: 30, windowMs: 60000, rpd: Infinity },
  interview: { maxRequests: 100, windowMs: 60000, rpd: Infinity },
} as const;

export type AIFeature = keyof typeof LOVABLE_RATE_LIMITS;

// Legacy export for backward compatibility
export const AI_RATE_LIMITS = LOVABLE_RATE_LIMITS;

// Type for rate limit config
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  rpd: number;
}

type RateLimitProfile = Record<AIFeature, RateLimitConfig>;

/**
 * Gets the appropriate rate limits based on the current AI provider and tier
 */
function getRateLimitsForProvider(): RateLimitProfile {
  const { aiProvider, geminiKeyTier } = useSettingsStore.getState();
  
  if (aiProvider === 'lovable') {
    return LOVABLE_RATE_LIMITS as unknown as RateLimitProfile;
  }
  
  // Gemini provider
  if (geminiKeyTier === 'paid') {
    return GEMINI_PAID_RATE_LIMITS as unknown as RateLimitProfile;
  }
  
  // Default to free tier limits for safety
  return GEMINI_FREE_RATE_LIMITS as unknown as RateLimitProfile;
}

/**
 * Checks if a daily limit has been exceeded (for Gemini free tier)
 */
function checkDailyLimit(feature: AIFeature): { exceeded: boolean; remaining: number } {
  const { aiProvider, geminiKeyTier, geminiDailyUsage } = useSettingsStore.getState();
  
  // Only check daily limits for Gemini free tier
  if (aiProvider !== 'gemini' || geminiKeyTier !== 'free') {
    return { exceeded: false, remaining: Infinity };
  }
  
  const limits = GEMINI_FREE_RATE_LIMITS[feature];
  if (limits.rpd === Infinity) {
    return { exceeded: false, remaining: Infinity };
  }
  
  // Check if we need to reset (new day in Pacific time)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  if (geminiDailyUsage.date !== today) {
    // New day, reset happens on next increment
    return { exceeded: false, remaining: limits.rpd };
  }
  
  const remaining = limits.rpd - geminiDailyUsage.count;
  return { exceeded: remaining <= 0, remaining: Math.max(0, remaining) };
}

/**
 * Smart rate limit check that considers provider, tier, and daily limits
 */
export function checkAIRateLimit(
  feature: AIFeature
): { allowed: boolean; waitSeconds: number; dailyRemaining?: number } {
  const limits = getRateLimitsForProvider();
  const limit = limits[feature];
  
  // Check daily limit first (for Gemini free tier)
  const dailyCheck = checkDailyLimit(feature);
  if (dailyCheck.exceeded) {
    return { 
      allowed: false, 
      waitSeconds: 0, 
      dailyRemaining: 0,
    };
  }
  
  // Check RPM limit
  const allowed = aiRateLimiter.canMakeRequest(
    `ai:${feature}`,
    limit.maxRequests,
    limit.windowMs
  );

  if (!allowed) {
    const waitMs = aiRateLimiter.getTimeUntilReset(
      `ai:${feature}`,
      limit.windowMs
    );
    return { 
      allowed: false, 
      waitSeconds: Math.ceil(waitMs / 1000),
      dailyRemaining: dailyCheck.remaining,
    };
  }

  return { 
    allowed: true, 
    waitSeconds: 0,
    dailyRemaining: dailyCheck.remaining,
  };
}

/**
 * Gets current usage stats for display
 */
export function getAIUsageStats(feature: AIFeature): {
  rpm: { used: number; limit: number };
  rpd: { used: number; limit: number } | null;
} {
  const limits = getRateLimitsForProvider();
  const limit = limits[feature];
  const { aiProvider, geminiKeyTier, geminiDailyUsage } = useSettingsStore.getState();
  
  const remaining = aiRateLimiter.getRemainingRequests(
    `ai:${feature}`,
    limit.maxRequests,
    limit.windowMs
  );
  
  const result: ReturnType<typeof getAIUsageStats> = {
    rpm: {
      used: limit.maxRequests - remaining,
      limit: limit.maxRequests,
    },
    rpd: null,
  };
  
  // Add daily stats for Gemini free tier
  if (aiProvider === 'gemini' && geminiKeyTier === 'free' && limit.rpd !== Infinity) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const dailyUsed = geminiDailyUsage.date === today ? geminiDailyUsage.count : 0;
    result.rpd = {
      used: dailyUsed,
      limit: limit.rpd,
    };
  }
  
  return result;
}

