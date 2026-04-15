import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';

const TOOL_TTL_DAYS: Record<string, number> = {
  get_company_briefing: 7,
};

function normalizeCacheKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

export function useToolCache() {
  const { user } = useAuth();

  const getCache = useCallback(async <T>(
    toolName: string,
    rawKey: string
  ): Promise<T | null> => {
    if (!user) return null;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      const { data, error } = await supabase
        .from('tool_cache')
        .select('output, expires_at')
        .eq('user_id', user.id)
        .eq('tool_name', toolName)
        .eq('cache_key', cacheKey)
        .single();

      if (error || !data) return null;
      if (new Date(data.expires_at as string) < new Date()) return null;
      return data.output as T;
    } catch {
      return null;
    }
  }, [user]);

  const setCache = useCallback(async (
    toolName: string,
    rawKey: string,
    output: unknown
  ): Promise<void> => {
    if (!user) return;
    const cacheKey = normalizeCacheKey(rawKey);
    const ttlDays = TOOL_TTL_DAYS[toolName] ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    try {
      await supabase
        .from('tool_cache')
        .upsert(
          {
            user_id: user.id,
            tool_name: toolName,
            cache_key: cacheKey,
            output,
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: 'user_id,tool_name,cache_key' }
        );
    } catch {
      // Best-effort cache write — silently ignore failures
    }
  }, [user]);

  const deleteCache = useCallback(async (
    toolName: string,
    rawKey: string
  ): Promise<void> => {
    if (!user) return;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      await supabase
        .from('tool_cache')
        .delete()
        .eq('user_id', user.id)
        .eq('tool_name', toolName)
        .eq('cache_key', cacheKey);
    } catch {
      // Best-effort
    }
  }, [user]);

  const getCacheAge = useCallback(async (
    toolName: string,
    rawKey: string
  ): Promise<number | null> => {
    if (!user) return null;
    const cacheKey = normalizeCacheKey(rawKey);
    try {
      const { data, error } = await supabase
        .from('tool_cache')
        .select('created_at, expires_at')
        .eq('user_id', user.id)
        .eq('tool_name', toolName)
        .eq('cache_key', cacheKey)
        .single();

      if (error || !data) return null;
      if (new Date(data.expires_at as string) < new Date()) return null;
      const ageDays = (Date.now() - new Date(data.created_at as string).getTime()) / (1000 * 60 * 60 * 24);
      return Math.floor(ageDays);
    } catch {
      return null;
    }
  }, [user]);

  return { getCache, setCache, deleteCache, getCacheAge };
}
