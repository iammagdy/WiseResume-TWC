import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

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
  portfolioSnapshot?: Record<string, unknown> | null;
}

interface Profile {
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
  portfolioSections: Record<string, boolean> | null;
  portfolioMetaTitle: string | null;
  portfolioMetaDescription: string | null;
  // New fields
  views: number;
  portfolioStyle: string | null;
  portfolioLayout: string | null;
  portfolioAccentColor: string | null;
  portfolioFont: string | null;
  openToWork: boolean;
  availabilityHeadline: string | null;
  // Portfolio extras (case studies, services, snapshot)
  portfolioExtras: PortfolioExtras;
  portfolioSyncMode: 'auto' | 'locked';
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
  const fields = [
    profile.fullName,
    profile.avatarUrl,
    profile.jobTitle,
    profile.industry,
    profile.careerLevel,
    profile.location,
    profile.linkedinUrl,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

async function fetchProfile(userId: string, user?: User | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, profile_completed, username, portfolio_bio, portfolio_enabled, portfolio_resume_id, github_url, website_url, twitter_url, contact_email, portfolio_theme, phone_number, portfolio_sections, portfolio_meta_title, portfolio_meta_description, views, portfolio_style, portfolio_layout, portfolio_accent_color, portfolio_font, open_to_work, availability_headline, portfolio_extras, portfolio_sync_mode')
    .eq('user_id', userId)
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
      portfolioSections: d.portfolio_sections as Record<string, boolean> | null,
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
    };
  }

  // No profile exists - create one with OAuth metadata
  const defaultFullName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const defaultAvatarUrl = user?.user_metadata?.avatar_url || null;

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
  };

  // Create the row via upsert
  await supabase.from('profiles').upsert(
    {
      user_id: userId,
      full_name: defaultFullName,
      avatar_url: defaultAvatarUrl,
    },
    { onConflict: 'user_id' }
  );

  return defaultProfile;
}

export function useProfile(userId: string | undefined, user?: User | null) {
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!, user),
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data after saves
    gcTime: 10 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!userId) throw new Error('No user ID');

      // Only send the fields that are explicitly in `updates` — prevents data races
      // on concurrent saves and avoids overwriting stale fallback values.
      const dbUpdates: Record<string, unknown> = { user_id: userId };

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

      const { error } = await supabase
        .from('profiles')
        .upsert(dbUpdates as never, { onConflict: 'user_id' });

      if (error) throw error;
      return updates;
    },
    onSuccess: (updates) => {
      // Optimistically update the cache — no toast here to avoid double toast
      queryClient.setQueryData(['profile', userId], (old: Profile | null) =>
        old ? { ...old, ...updates } : updates as Profile
      );
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
