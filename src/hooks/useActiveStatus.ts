import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

export function isActiveWithin24h(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 24 * 60 * 60 * 1000;
}

/**
 * Polls last_active_at every 60s, pausing when tab is hidden.
 */
export function useActiveStatus(username: string, initialLastActiveAt: string | null): string | null {
  const [lastActiveAt, setLastActiveAt] = useState(initialLastActiveAt);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLastActiveAt(initialLastActiveAt);
  }, [initialLastActiveAt]);

  useEffect(() => {
    const poll = async () => {
      const { data } = await supabase.rpc('get_portfolio_active_status', {
        p_username: username.toLowerCase(),
      });
      if (data) setLastActiveAt(data as string);
    };

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(poll, 60_000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [username]);

  return lastActiveAt;
}
