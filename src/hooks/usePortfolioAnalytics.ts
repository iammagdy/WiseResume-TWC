import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortfolioVisit {
  id: string;
  country: string | null;
  city: string | null;
  time_spent_seconds: number | null;
  sections_viewed: string[];
  referrer: string | null;
  short_link_id: string | null;
  visited_at: string;
}

export interface VisitSummary {
  total_visits: number;
  unique_countries: number;
  avg_time_seconds: number | null;
}

export interface PortfolioAnalytics {
  visits: PortfolioVisit[];
  summary: VisitSummary;
}

export interface ShortLink {
  id: string;
  owner_user_id: string;
  portfolio_username: string;
  label: string;
  click_count: number;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a random 5-char alphanumeric slug */
function generateSlug(length = 5): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch visitor analytics for a portfolio (owner only) */
export function usePortfolioAnalytics(username: string | undefined) {
  return useQuery<PortfolioAnalytics | null>({
    queryKey: ['portfolio-analytics', username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase.rpc('get_portfolio_analytics', {
        p_username: username.toLowerCase(),
      });
      if (error) {
        console.error('Analytics fetch error:', error);
        return null;
      }
      if (!data) return null;
      const d = data as unknown as { visits: PortfolioVisit[]; summary: VisitSummary };
      return {
        visits: d.visits ?? [],
        summary: d.summary ?? { total_visits: 0, unique_countries: 0, avg_time_seconds: null },
      };
    },
    enabled: !!username,
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute for live feel
  });
}

/** Fetch short links owned by the current user */
export function useShortLinks(userId: string | undefined, portfolioUsername: string | undefined) {
  return useQuery<ShortLink[]>({
    queryKey: ['short-links', userId],
    queryFn: async () => {
      if (!userId || !portfolioUsername) return [];
      const { data, error } = await supabase
        .from('short_links')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('portfolio_username', portfolioUsername.toLowerCase())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShortLink[];
    },
    enabled: !!userId && !!portfolioUsername,
  });
}

/** Create a new short link (supports portfolio links and universal target URLs) */
export function useCreateShortLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      portfolioUsername,
      label,
      targetUrl,
    }: {
      userId: string;
      portfolioUsername?: string;
      label: string;
      targetUrl?: string;
    }) => {
      // Generate a slug and retry on conflict (astronomically rare)
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = generateSlug(5);
        const { data, error } = await supabase
          .from('short_links')
          .insert({
            id: slug,
            owner_user_id: userId,
            portfolio_username: portfolioUsername?.toLowerCase() ?? null,
            label: label.trim() || 'My Link',
            target_url: targetUrl ?? (portfolioUsername ? `/p/${portfolioUsername.toLowerCase()}` : null),
          } as any)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') continue; // duplicate slug — retry
          throw error;
        }
        return data as ShortLink;
      }
      throw new Error('Failed to generate unique slug after 3 attempts');
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['short-links', vars.userId] });
      toast.success('Short link created!');
    },
    onError: (err) => {
      console.error('Create short link error:', err);
      toast.error('Failed to create link');
    },
  });
}

/** Delete a short link */
export function useDeleteShortLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase.from('short_links').delete().eq('id', id);
      if (error) throw error;
      return { id, userId };
    },
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['short-links', vars.userId] });
      toast.success('Link deleted');
    },
    onError: (err) => {
      console.error('Delete short link error:', err);
      toast.error('Failed to delete link');
    },
  });
}
