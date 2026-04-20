import { useCallback } from 'react';
import type { KindeAppUser } from '@/contexts/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { getUserId } from '@/lib/supabaseBridge';

export type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';

export interface CaseStudy {
  id: string;
  title: string;
  challenge: string;
  outcome: string;
  technologies: string[];
  url?: string;
  linkedProjectId?: string;
}

export interface PortfolioService {
  id: string;
  title: string;
  description: string;
  category: 'development' | 'design' | 'consulting' | 'writing' | 'other';
  startingPrice?: string;
}

export interface PortfolioExtras {
  caseStudies?: CaseStudy[];
  services?: PortfolioService[];
  testimonials?: Array<{ id: string; quote: string; authorName: string; authorTitle?: string; avatarUrl?: string }>;
  highlights?: Array<{ id: string; value: string; label: string }>;
  portfolioSnapshot?: Record<string, unknown> | null;
  portfolioSummary?: string;
  lastSyncedFromResumeAt?: string | null;
  scrollEffect?: 'fade' | 'parallax' | 'tilt-3d' | 'cinematic';
}

import { PortfolioSections } from '@/components/portfolio/editor/ContentVisibilitySection';

export interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: CareerLevel | null;
  location: string | null;
  linkedinUrl: string | null;
  profileCompleted: boolean;
  username: string | null;
  portfolioBio: string | null;
  portfolioEnabled: boolean;
  portfolioResumeId: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  contactEmail: string | null;
  theme: string | null;
  phoneNumber: string | null;
  portfolioSections: PortfolioSections | null;
  portfolioMetaTitle: string | null;
  portfolioMetaDescription: string | null;
  views: number;
  portfolioStyle: string | null;
  portfolioLayout: string | null;
  portfolioAccentColor: string | null;
  portfolioFont: string | null;
  openToWork: boolean;
  availabilityHeadline: string | null;
  portfolioExtras: PortfolioExtras;
  portfolioSyncMode: 'auto' | 'locked';
  loginStreak: number;
  lastLoginDate: string | null;
  digestEnabled: boolean;
  hiredAt: string | null;
  updatedAt: string | null;
  portfolioDraft: Record<string, unknown> | null;
  portfolioDraftSavedAt: string | null;
}

export const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Marketing',
  'Engineering',
  'Design',
  'Sales',
  'Legal',
  'Consulting',
  'Other',
] as const;

export const CAREER_LEVEL_OPTIONS: { value: CareerLevel; label: string; description: string }[] = [
  { value: 'entry', label: 'Entry', description: '0-2 years' },
  { value: 'mid', label: 'Mid', description: '3-5 years' },
  { value: 'senior', label: 'Senior', description: '6-10 years' },
  { value: 'executive', label: 'Executive', description: '10+ years' },
];

export function calculateProfileCompletion(profile: Profile | null): number {
  if (!profile) return 0;
  const coreFields = [
    profile.fullName, profile.avatarUrl, profile.jobTitle, profile.industry,
    profile.careerLevel, profile.location, profile.linkedinUrl,
  ];
  const coreFilled = coreFields.filter(Boolean).length;
  const coreScore = (coreFilled / coreFields.length) * 70;

  const extendedFields = [profile.phoneNumber, profile.portfolioBio, profile.contactEmail];
  const extendedFilled = extendedFields.filter(Boolean).length;
  const extendedScore = (extendedFilled / extendedFields.length) * 30;

  return Math.round(coreScore + extendedScore);
}

export function getNextMissingField(profile: Partial<Profile> | null): { field: string; hint: string } | null {
  if (!profile) return { field: 'fullName', hint: 'Add your name to personalize your profile' };
  const checks: Array<{ value: unknown; field: string; hint: string }> = [
    { value: profile.avatarUrl, field: 'avatarUrl', hint: 'Upload a photo to personalize your profile' },
    { value: profile.fullName, field: 'fullName', hint: 'Add your name so others can find you' },
    { value: profile.jobTitle, field: 'jobTitle', hint: 'Add your job title for better AI suggestions' },
    { value: profile.industry, field: 'industry', hint: 'Select your industry to tailor recommendations' },
    { value: profile.careerLevel, field: 'careerLevel', hint: 'Set your career level for relevant advice' },
    { value: profile.location, field: 'location', hint: 'Add your location for local job matches' },
    { value: profile.linkedinUrl, field: 'linkedinUrl', hint: 'Link your LinkedIn to import profile data' },
    { value: profile.phoneNumber, field: 'phoneNumber', hint: 'Add a phone number for your resume contact info' },
    { value: profile.portfolioBio, field: 'portfolioBio', hint: 'Write a bio for your portfolio website' },
    { value: profile.contactEmail, field: 'contactEmail', hint: 'Add a contact email for your portfolio' },
  ];
  return checks.find(c => !c.value) || null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the effective Supabase UUID for a user. Prefers the bridged ID from
 * the token exchange, falls back to the raw userId only if it's already a
 * valid UUID. Returns null when the bridge has not settled yet — callers MUST
 * gate their queries on this so we never fetch (or persist) with no identity.
 */
function resolveEffectiveId(userId: string | undefined): string | null {
  const bridgedId = getUserId();
  if (bridgedId) return bridgedId;
  if (userId && UUID_REGEX.test(userId)) return userId;
  return null;
}

type ProfileRow = Record<string, unknown> | null;

function rowToProfile(d: Record<string, unknown> | null, user?: KindeAppUser | null): Profile {
  if (!d) {
    return {
      fullName: user?.name || null,
      avatarUrl: null,
      jobTitle: null, industry: null, careerLevel: null, location: null,
      linkedinUrl: null, profileCompleted: false, username: null,
      portfolioBio: null, portfolioEnabled: false, portfolioResumeId: null,
      githubUrl: null, websiteUrl: null, twitterUrl: null, contactEmail: null,
      theme: null, phoneNumber: null, portfolioSections: null,
      portfolioMetaTitle: null, portfolioMetaDescription: null,
      views: 0, portfolioStyle: null, portfolioLayout: null,
      portfolioAccentColor: null, portfolioFont: null, openToWork: false,
      availabilityHeadline: null, portfolioExtras: {}, portfolioSyncMode: 'auto',
      loginStreak: 1, lastLoginDate: null, digestEnabled: true, hiredAt: null,
      updatedAt: null, portfolioDraft: null, portfolioDraftSavedAt: null,
    };
  }
  return {
    fullName: (d.full_name as string | null) ?? null,
    avatarUrl: (d.avatar_url as string | null) ?? null,
    jobTitle: (d.job_title as string | null) ?? null,
    industry: (d.industry as string | null) ?? null,
    careerLevel: (d.career_level as CareerLevel | null) ?? null,
    location: (d.location as string | null) ?? null,
    linkedinUrl: (d.linkedin_url as string | null) ?? null,
    profileCompleted: (d.profile_completed as boolean) ?? false,
    username: (d.username as string | null) ?? null,
    portfolioBio: (d.portfolio_bio as string | null) ?? null,
    portfolioEnabled: (d.portfolio_enabled as boolean) ?? false,
    portfolioResumeId: (d.portfolio_resume_id as string | null) ?? null,
    githubUrl: (d.github_url as string | null) ?? null,
    websiteUrl: (d.website_url as string | null) ?? null,
    twitterUrl: (d.twitter_url as string | null) ?? null,
    contactEmail: (d.contact_email as string | null) ?? null,
    theme: (d.portfolio_theme as string | null) ?? null,
    phoneNumber: (d.phone_number as string | null) ?? null,
    portfolioSections: (d.portfolio_sections as PortfolioSections | null) ?? null,
    portfolioMetaTitle: (d.portfolio_meta_title as string | null) ?? null,
    portfolioMetaDescription: (d.portfolio_meta_description as string | null) ?? null,
    views: (d.views as number) ?? 0,
    portfolioStyle: (d.portfolio_style as string) ?? null,
    portfolioLayout: (d.portfolio_layout as string) ?? null,
    portfolioAccentColor: (d.portfolio_accent_color as string) ?? null,
    portfolioFont: (d.portfolio_font as string) ?? null,
    openToWork: (d.open_to_work as boolean) ?? false,
    availabilityHeadline: (d.availability_headline as string) ?? null,
    portfolioExtras: (d.portfolio_extras as PortfolioExtras) ?? {},
    portfolioSyncMode: ((d.portfolio_sync_mode as string) ?? 'auto') as 'auto' | 'locked',
    loginStreak: (d.login_streak as number) ?? 1,
    lastLoginDate: (d.last_login_date as string) ?? null,
    digestEnabled: (d.digest_enabled as boolean) ?? true,
    hiredAt: (d.hired_at as string) ?? null,
    updatedAt: (d.updated_at as string) ?? null,
    portfolioDraft: (d.portfolio_draft as Record<string, unknown>) ?? null,
    portfolioDraftSavedAt: (d.portfolio_draft_saved_at as string) ?? null,
  };
}

async function fetchProfile(_effectiveId: string, user?: KindeAppUser | null): Promise<Profile> {
  const { profile } = await apiFetch<{ profile: ProfileRow }>('/api/data/profile');
  if (profile) return rowToProfile(profile, user);

  // Create a default row server-side so subsequent reads return data.
  const defaultFullName = user?.name || null;
  await apiFetch('/api/data/profile', {
    method: 'PATCH',
    body: { full_name: defaultFullName },
  });

  return rowToProfile(null, user);
}

export function useProfile(userId: string | undefined, user?: KindeAppUser | null) {
  const queryClient = useQueryClient();

  const effectiveId = resolveEffectiveId(userId);

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', effectiveId],
    queryFn: () => fetchProfile(effectiveId!, user),
    enabled: !!effectiveId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const id = resolveEffectiveId(userId);
      if (!id) throw new Error('Profile save unavailable — app is still initializing');

      // Translate camelCase Profile fields into snake_case columns, sending
      // ONLY what the caller explicitly set. The server filters anything it
      // can't persist (column doesn't exist, not in the writable allow-list).
      const dbUpdates: Record<string, unknown> = {};
      const map: Record<string, string> = {
        fullName: 'full_name', avatarUrl: 'avatar_url', jobTitle: 'job_title',
        industry: 'industry', careerLevel: 'career_level', location: 'location',
        linkedinUrl: 'linkedin_url', profileCompleted: 'profile_completed',
        username: 'username', portfolioBio: 'portfolio_bio',
        portfolioEnabled: 'portfolio_enabled', portfolioResumeId: 'portfolio_resume_id',
        githubUrl: 'github_url', websiteUrl: 'website_url', twitterUrl: 'twitter_url',
        contactEmail: 'contact_email', theme: 'portfolio_theme', phoneNumber: 'phone_number',
        portfolioSections: 'portfolio_sections', portfolioMetaTitle: 'portfolio_meta_title',
        portfolioMetaDescription: 'portfolio_meta_description',
        portfolioStyle: 'portfolio_style', portfolioLayout: 'portfolio_layout',
        portfolioAccentColor: 'portfolio_accent_color', portfolioFont: 'portfolio_font',
        openToWork: 'open_to_work', availabilityHeadline: 'availability_headline',
        portfolioExtras: 'portfolio_extras', portfolioSyncMode: 'portfolio_sync_mode',
        loginStreak: 'login_streak', lastLoginDate: 'last_login_date',
        digestEnabled: 'digest_enabled', hiredAt: 'hired_at',
        portfolioDraft: 'portfolio_draft', portfolioDraftSavedAt: 'portfolio_draft_saved_at',
      };
      for (const [camel, snake] of Object.entries(map)) {
        const v = (updates as Record<string, unknown>)[camel];
        if (v !== undefined) dbUpdates[snake] = v;
      }

      await apiFetch('/api/data/profile', { method: 'PATCH', body: dbUpdates });
      return updates;
    },
    onSuccess: (updates) => {
      queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
        old ? { ...old, ...updates } : old
      );
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      // Let callers handle error display
    },
  });

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<void> => {
      await updateMutation.mutateAsync(updates);
    },
    [updateMutation]
  );

  return { profile, loading, updateProfile };
}
