import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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

function generateSlug(length = 5): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function docToVisit(doc: Record<string, unknown>): PortfolioVisit {
  const raw = doc.sections_timing;
  return {
    id: doc.$id as string,
    country: (doc.country as string | null) ?? null,
    city: (doc.city as string | null) ?? null,
    time_spent_seconds: (doc.time_spent_seconds as number | null) ?? null,
    sections_viewed: Array.isArray(doc.sections_viewed) ? (doc.sections_viewed as string[]) : [],
    sections_timing: typeof raw === 'string'
      ? JSON.parse(raw) as Record<string, number>
      : ((raw as Record<string, number>) ?? {}),
    referrer: (doc.referrer as string | null) ?? null,
    short_link_id: (doc.short_link_id as string | null) ?? null,
    visited_at: (doc.visited_at as string) ?? (doc.$createdAt as string),
    device: (doc.device as 'mobile' | 'desktop' | 'tablet' | null) ?? null,
    company_name: (doc.company_name as string | null) ?? null,
    ab_variant: (doc.ab_variant as 'a' | 'b' | null) ?? null,
  };
}

function computeSummary(visits: PortfolioVisit[]): VisitSummary {
  const total_visits = visits.length;
  const countries = new Set(visits.map(v => v.country).filter(Boolean));
  const unique_countries = countries.size;

  const withTime = visits.filter(v => v.time_spent_seconds !== null);
  const avg_time_seconds = withTime.length > 0
    ? withTime.reduce((s, v) => s + (v.time_spent_seconds ?? 0), 0) / withTime.length
    : null;

  const varA = visits.filter(v => v.ab_variant === 'a');
  const varB = visits.filter(v => v.ab_variant === 'b');
  const avgA = varA.filter(v => v.time_spent_seconds !== null);
  const avgB = varB.filter(v => v.time_spent_seconds !== null);

  return {
    total_visits,
    unique_countries,
    avg_time_seconds: avg_time_seconds !== null ? Math.round(avg_time_seconds) : null,
    visits_variant_a: varA.length,
    visits_variant_b: varB.length,
    avg_time_variant_a: avgA.length > 0
      ? Math.round(avgA.reduce((s, v) => s + (v.time_spent_seconds ?? 0), 0) / avgA.length)
      : null,
    avg_time_variant_b: avgB.length > 0
      ? Math.round(avgB.reduce((s, v) => s + (v.time_spent_seconds ?? 0), 0) / avgB.length)
      : null,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch visitor analytics for a portfolio (owner only) */
export function usePortfolioAnalytics(username: string | undefined) {
  return useQuery<PortfolioAnalytics | null>({
    queryKey: ['portfolio-analytics', username],
    queryFn: async () => {
      if (!username) return null;
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.portfolio_visits, [
          Query.equal('username', username.toLowerCase()),
          Query.orderDesc('$createdAt'),
          Query.limit(500),
        ]);
        const visits = res.documents.map(
          d => docToVisit(d as unknown as Record<string, unknown>),
        );
        return { visits, summary: computeSummary(visits) };
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

function docToShortLink(doc: Record<string, unknown>): ShortLink {
  return {
    id: doc.$id as string,
    owner_user_id: doc.owner_user_id as string,
    portfolio_id: (doc.portfolio_id as string | null) ?? null,
    label: (doc.label as string) ?? '',
    click_count: Number(doc.click_count ?? 0),
    created_at: doc.$createdAt as string,
  };
}

/** Fetch short links owned by the current user */
export function useShortLinks(userId: string | undefined, _portfolioUsername?: string | undefined) {
  return useQuery<ShortLink[]>({
    queryKey: ['short-links', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.short_links, [
        Query.equal('owner_user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      return res.documents.map(d => docToShortLink(d as unknown as Record<string, unknown>));
    },
    enabled: !!userId,
  });
}

/** Create a new short link */
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
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.short_links,
        slug, // use slug as document ID so /r/<slug> resolves directly
        {
          owner_user_id: userId,
          label: label.trim() || 'My Link',
          target_url: targetUrl ?? (portfolioUsername ? `/p/${portfolioUsername.toLowerCase()}` : null),
          portfolio_id: null,
          click_count: 0,
        },
      );
      return docToShortLink(doc as unknown as Record<string, unknown>);
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
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.short_links, id);
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
