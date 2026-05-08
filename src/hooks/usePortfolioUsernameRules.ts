import { useEffect, useState } from 'react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

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
      // The global rules document is expected to live at a known document ID or
      // be the only document in the collection.
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.portfolio_username_rules,
        [Query.limit(1)],
      );
      if (res.documents.length === 0) {
        globalCache = DEFAULT_RULES;
        return DEFAULT_RULES;
      }
      const doc = res.documents[0] as unknown as Record<string, unknown>;
      const rules: PortfolioUsernameRules = {
        min_length: Number(doc.min_length ?? DEFAULT_RULES.min_length),
        max_length: Number(doc.max_length ?? DEFAULT_RULES.max_length),
        allow_hyphens: Boolean(doc.allow_hyphens ?? DEFAULT_RULES.allow_hyphens),
      };
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
    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.portfolio_user_overrides,
      [Query.equal('user_id', userId), Query.limit(1)],
    );
    if (res.documents.length === 0) return {};
    const doc = res.documents[0] as unknown as Record<string, unknown>;
    const out: Partial<PortfolioUsernameRules> = {};
    if (doc.min_length != null) out.min_length = Number(doc.min_length);
    if (doc.max_length != null) out.max_length = Number(doc.max_length);
    if (doc.allow_hyphens != null) out.allow_hyphens = Boolean(doc.allow_hyphens);
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
 * global rules so admin-granted exceptions (e.g. min_length=1) are honoured.
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
