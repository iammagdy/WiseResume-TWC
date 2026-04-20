import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortfolioVisit {
  id: string;
  country: string | null;
  city: string | null;
  time_spent_seconds: number | null;
  sections_viewed: string[];
  sections_timing: Record<string, number>;
  referrer: string | null;
  short_link_id: string | null;
  visited_at: string;
  device: 'mobile' | 'desktop' | 'tablet' | null;
  company_name: string | null;
  ab_variant: 'a' | 'b' | null;
}

export interface VisitSummary {
  total_visits: number;
  unique_countries: number;
  avg_time_seconds: number | null;
  avg_time_variant_a: number | null;
  avg_time_variant_b: number | null;
  visits_variant_a: number;
  visits_variant_b: number;
}

export interface PortfolioAnalytics {
  visits: PortfolioVisit[];
  summary: VisitSummary;
}

export interface ShortLink {
  id: string;
  owner_user_id: string;
  portfolio_id: string | null;
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
      try {
        const data = await apiFetch<PortfolioAnalytics>('/api/data/portfolio-analytics', {
          query: { username: username.toLowerCase() },
        });
        return {
          visits: (data.visits ?? []).map(v => ({
            ...v,
            sections_timing: (v.sections_timing as unknown) ?? {},
          })),
          summary: data.summary ?? {
            total_visits: 0, unique_countries: 0, avg_time_seconds: null,
            avg_time_variant_a: null, avg_time_variant_b: null,
            visits_variant_a: 0, visits_variant_b: 0,
          },
        };
      } catch (err) {
        console.error('Analytics fetch error:', err);
        return null;
      }
    },
    enabled: !!username,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch short links owned by the current user.
 */
export function useShortLinks(userId: string | undefined, _portfolioUsername?: string | undefined) {
  return useQuery<ShortLink[]>({
    queryKey: ['short-links', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { links } = await apiFetch<{ links: ShortLink[] }>('/api/data/short-links');
      return links;
    },
    enabled: !!userId,
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
      const slug = generateSlug(5);
      const { link } = await apiFetch<{ link: ShortLink }>('/api/data/short-links', {
        method: 'POST',
        body: {
          id: slug,
          owner_user_id: userId,
          label: label.trim() || 'My Link',
          target_url: targetUrl ?? (portfolioUsername ? `/p/${portfolioUsername.toLowerCase()}` : null),
        },
      });
      return link;
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
      await apiFetch(`/api/data/short-links/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
