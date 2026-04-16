import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

export interface PortfolioUsernameRules {
  min_length: number;
  max_length: number;
  allow_hyphens: boolean;
}

const DEFAULT_RULES: PortfolioUsernameRules = {
  min_length: 3,
  max_length: 30,
  allow_hyphens: true,
};

let cached: PortfolioUsernameRules | null = null;
let inflight: Promise<PortfolioUsernameRules> | null = null;

async function fetchRules(): Promise<PortfolioUsernameRules> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from('portfolio_username_rules')
        .select('min_length, max_length, allow_hyphens')
        .eq('id', 1)
        .maybeSingle();
      const rules = data
        ? {
            min_length: Number(data.min_length ?? DEFAULT_RULES.min_length),
            max_length: Number(data.max_length ?? DEFAULT_RULES.max_length),
            allow_hyphens: Boolean(data.allow_hyphens ?? DEFAULT_RULES.allow_hyphens),
          }
        : DEFAULT_RULES;
      cached = rules;
      return rules;
    } catch {
      cached = DEFAULT_RULES;
      return DEFAULT_RULES;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function clearPortfolioUsernameRulesCache() {
  cached = null;
}

export function usePortfolioUsernameRules(): PortfolioUsernameRules {
  const [rules, setRules] = useState<PortfolioUsernameRules>(cached ?? DEFAULT_RULES);
  useEffect(() => {
    let mounted = true;
    fetchRules().then((r) => {
      if (mounted) setRules(r);
    });
    return () => { mounted = false; };
  }, []);
  return rules;
}
