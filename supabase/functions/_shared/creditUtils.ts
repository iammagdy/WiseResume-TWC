import { getServiceClient } from './dbClient.ts';

export interface CreditCheckResult {
  hasCredits: boolean;
  remaining: number;
}

/**
 * Checks if a user has sufficient AI credits (or BYOK setup) to perform an action.
 * This is meant to be called server-side to prevent bypass of the client guards.
 * @param userId the user's Supabase UUID
 */
export async function checkUserCreditBalance(userId: string): Promise<CreditCheckResult> {
  const supabase = getServiceClient();

  // 1. Check if user is BYOK (unlimited credits)
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('ai_provider')
    .eq('user_id', userId)
    .maybeSingle();
    
  // Let the aiClient handle provider matching, but assume BYOK is set if provider is not wiseresume or null
  const isBYOK = preferences?.ai_provider && preferences.ai_provider !== 'wiseresume';
  if (isBYOK) {
    return { hasCredits: true, remaining: 9999 };
  }

  // 2. Fetch credit data from ai_credits table (matches useAICredits hook logic)
  const { data: credits, error } = await supabase
    .from('ai_credits')
    .select('daily_usage, daily_limit, usage_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch ai_credits:', error);
    // Fail closed to prevent abuse, or fail open to prevent breaking everything?
    // Failing closed if there's an error to be strictly secure for credit limits
    return { hasCredits: false, remaining: 0 };
  }

  // If no record, they essentially have default limits
  if (!credits) {
    return { hasCredits: true, remaining: 20 }; // Using default 20 limit
  }

  const today = new Date().toISOString().split('T')[0];
  
  // If last usage wasn't today, limits are implicitly reset
  if (credits.usage_date !== today) {
    return { hasCredits: true, remaining: credits.daily_limit || 20 };
  }

  const remaining = (credits.daily_limit || 20) - (credits.daily_usage || 0);
  
  return {
    hasCredits: remaining > 0,
    remaining: Math.max(0, remaining)
  };
}
