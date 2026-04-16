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

let globalCache: PortfolioUsernameRules | null = null;
let globalInflight: Promise<PortfolioUsernameRules> | null = null;

async function fetchGlobalRules(): Promise<PortfolioUsernameRules> {
  if (globalCache) return globalCache;
  if (globalInflight) return globalInflight;
  globalInflight = (async () => {
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
      globalCache = rules;
      return rules;
    } catch {
      globalCache = DEFAULT_RULES;
      return DEFAULT_RULES;
    } finally {
      globalInflight = null;
    }
  })();
  return globalInflight;
}

async function fetchUserOverride(userId: string): Promise<Partial<PortfolioUsernameRules>> {
  try {
    const { data } = await supabase
      .from('portfolio_user_overrides')
      .select('min_length, max_length, allow_hyphens')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return {};
    const out: Partial<PortfolioUsernameRules> = {};
    if (data.min_length != null) out.min_length = Number(data.min_length);
    if (data.max_length != null) out.max_length = Number(data.max_length);
    if (data.allow_hyphens != null) out.allow_hyphens = Boolean(data.allow_hyphens);
    return out;
  } catch {
    return {};
  }
}

export function clearPortfolioUsernameRulesCache() {
  globalCache = null;
}

/**
 * Returns the effective portfolio-username rules for the given user.
 * Per-user overrides from `portfolio_user_overrides` are merged on top of the
 * global rules so admin-granted exceptions (e.g. min_length=1) are honored
 * throughout the editor UI.
 */
export function usePortfolioUsernameRules(userId?: string | null): PortfolioUsernameRules {
  const [rules, setRules] = useState<PortfolioUsernameRules>(globalCache ?? DEFAULT_RULES);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [global, override] = await Promise.all([
        fetchGlobalRules(),
        userId ? fetchUserOverride(userId) : Promise.resolve({} as Partial<PortfolioUsernameRules>),
      ]);
      if (!mounted) return;
      setRules({ ...global, ...override });
    })();
    return () => { mounted = false; };
  }, [userId]);
  return rules;
}
