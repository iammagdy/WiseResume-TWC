import { useCallback } from 'react';
import type { KindeAppUser } from '@/contexts/AuthContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
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
  // Core fields worth 70% total (10% each)
  const coreFields = [
    profile.fullName,
    profile.avatarUrl,
    profile.jobTitle,
    profile.industry,
    profile.careerLevel,
    profile.location,
    profile.linkedinUrl,
  ];
  const coreFilled = coreFields.filter(Boolean).length;
  const coreScore = (coreFilled / coreFields.length) * 70;

  // Extended fields worth 30% total (10% each)
  const extendedFields = [
    profile.phoneNumber,
    profile.portfolioBio,
    profile.contactEmail,
  ];
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

async function fetchProfile(effectiveId: string, user?: KindeAppUser | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, profile_completed, username, portfolio_bio, portfolio_enabled, portfolio_resume_id, github_url, website_url, twitter_url, contact_email, portfolio_theme, phone_number, portfolio_sections, portfolio_meta_title, portfolio_meta_description, views, portfolio_style, portfolio_layout, portfolio_accent_color, portfolio_font, open_to_work, availability_headline, portfolio_extras, portfolio_sync_mode, login_streak, last_login_date, digest_enabled, hired_at, updated_at')
    .eq('user_id', effectiveId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  if (data) {
    const d = data as Record<string, unknown>;
    return {
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      jobTitle: data.job_title,
      industry: data.industry,
      careerLevel: data.career_level as CareerLevel | null,
      location: data.location,
      linkedinUrl: data.linkedin_url,
      profileCompleted: data.profile_completed ?? false,
      username: d.username as string | null,
      portfolioBio: d.portfolio_bio as string | null,
      portfolioEnabled: (d.portfolio_enabled as boolean) ?? false,
      portfolioResumeId: d.portfolio_resume_id as string | null,
      githubUrl: d.github_url as string | null,
      websiteUrl: d.website_url as string | null,
      twitterUrl: d.twitter_url as string | null,
      contactEmail: d.contact_email as string | null,
      theme: d.portfolio_theme as string | null,
      phoneNumber: d.phone_number as string | null,
      portfolioSections: d.portfolio_sections as PortfolioSections | null,
      portfolioMetaTitle: d.portfolio_meta_title as string | null,
      portfolioMetaDescription: d.portfolio_meta_description as string | null,
      // New fields
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
    };
  }

  // No profile exists - create one with Kinde user info
  const defaultFullName = user?.name || null;
  const defaultAvatarUrl = null;

  const defaultProfile: Profile = {
    fullName: defaultFullName,
    avatarUrl: defaultAvatarUrl,
    jobTitle: null,
    industry: null,
    careerLevel: null,
    location: null,
    linkedinUrl: null,
    profileCompleted: false,
    username: null,
    portfolioBio: null,
    portfolioEnabled: false,
    portfolioResumeId: null,
    githubUrl: null,
    websiteUrl: null,
    twitterUrl: null,
    contactEmail: null,
    theme: null,
    phoneNumber: null,
    portfolioSections: null,
    portfolioMetaTitle: null,
    portfolioMetaDescription: null,
    views: 0,
    portfolioStyle: null,
    portfolioLayout: null,
    portfolioAccentColor: null,
    portfolioFont: null,
    openToWork: false,
    availabilityHeadline: null,
    portfolioExtras: {},
    portfolioSyncMode: 'auto',
    loginStreak: 1,
    lastLoginDate: null,
    digestEnabled: true,
    hiredAt: null,
    updatedAt: null,
  };

  // Create the row via upsert — effectiveId is guaranteed non-null here (early return above)
  await supabase.from('profiles').upsert(
    {
      user_id: effectiveId,
      full_name: defaultFullName,
      avatar_url: defaultAvatarUrl,
    },
    { onConflict: 'user_id' }
  );

  return defaultProfile;
}

export function useProfile(userId: string | undefined, user?: KindeAppUser | null) {
  const queryClient = useQueryClient();

  // Stable cache key: always derived from the bridged Supabase UUID so every
  // consumer of useProfile (DesktopNav, SettingsPage, DashboardPage, …) reads
  // and writes the SAME cache entry, regardless of whether `user.id` happens
  // to be the Kinde id or the UUID at any given render.
  const effectiveId = resolveEffectiveId(userId);

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', effectiveId],
    queryFn: () => fetchProfile(effectiveId!, user),
    enabled: !!effectiveId,
    // Short staleTime so other tabs/sheets pick up edits quickly. The mutation
    // also broad-invalidates on success, so this is mostly a safety net.
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      // Re-resolve at mutation time in case the bridge settled after the hook ran.
      const id = resolveEffectiveId(userId);
      if (!id) throw new Error('Profile save unavailable — app is still initializing');

      // Only send the fields that are explicitly in `updates` — prevents data races
      // on concurrent saves and avoids overwriting stale fallback values.
      const dbUpdates: Record<string, unknown> = { user_id: id };

      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.careerLevel !== undefined) dbUpdates.career_level = updates.careerLevel;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
      if (updates.profileCompleted !== undefined) dbUpdates.profile_completed = updates.profileCompleted;
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.portfolioBio !== undefined) dbUpdates.portfolio_bio = updates.portfolioBio;
      if (updates.portfolioEnabled !== undefined) dbUpdates.portfolio_enabled = updates.portfolioEnabled;
      if (updates.portfolioResumeId !== undefined) dbUpdates.portfolio_resume_id = updates.portfolioResumeId;
      if (updates.githubUrl !== undefined) dbUpdates.github_url = updates.githubUrl;
      if (updates.websiteUrl !== undefined) dbUpdates.website_url = updates.websiteUrl;
      if (updates.twitterUrl !== undefined) dbUpdates.twitter_url = updates.twitterUrl;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      if (updates.theme !== undefined) dbUpdates.portfolio_theme = updates.theme;
      if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.portfolioSections !== undefined) dbUpdates.portfolio_sections = updates.portfolioSections;
      if (updates.portfolioMetaTitle !== undefined) dbUpdates.portfolio_meta_title = updates.portfolioMetaTitle;
      if (updates.portfolioMetaDescription !== undefined) dbUpdates.portfolio_meta_description = updates.portfolioMetaDescription;
      if (updates.portfolioStyle !== undefined) dbUpdates.portfolio_style = updates.portfolioStyle;
      if (updates.portfolioLayout !== undefined) dbUpdates.portfolio_layout = updates.portfolioLayout;
      if (updates.portfolioAccentColor !== undefined) dbUpdates.portfolio_accent_color = updates.portfolioAccentColor;
      if (updates.portfolioFont !== undefined) dbUpdates.portfolio_font = updates.portfolioFont;
      if (updates.openToWork !== undefined) dbUpdates.open_to_work = updates.openToWork;
      if (updates.availabilityHeadline !== undefined) dbUpdates.availability_headline = updates.availabilityHeadline;
      if (updates.portfolioExtras !== undefined) dbUpdates.portfolio_extras = updates.portfolioExtras;
      if (updates.portfolioSyncMode !== undefined) dbUpdates.portfolio_sync_mode = updates.portfolioSyncMode;
      if (updates.loginStreak !== undefined) dbUpdates.login_streak = updates.loginStreak;
      if (updates.lastLoginDate !== undefined) dbUpdates.last_login_date = updates.lastLoginDate;
      if (updates.digestEnabled !== undefined) dbUpdates.digest_enabled = updates.digestEnabled;
      if (updates.hiredAt !== undefined) dbUpdates.hired_at = updates.hiredAt;

      const { error } = await supabase
        .from('profiles')
        .upsert(dbUpdates as never, { onConflict: 'user_id' });

      if (error) throw error;
      return updates;
    },
    onSuccess: (updates) => {
      // Broad-update every cached ['profile', *] entry so any orphan keys
      // (e.g. one created with a Kinde id before the bridge settled) reflect
      // the new values immediately. Then invalidate to refetch authoritatively
      // from the DB.
      queryClient.setQueriesData<Profile | null>({ queryKey: ['profile'] }, (old) =>
        old ? { ...old, ...updates } : (updates as Profile)
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
