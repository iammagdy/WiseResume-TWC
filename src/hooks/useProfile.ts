import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

export type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';

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
    .select('full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, profile_completed, username, portfolio_bio, portfolio_enabled, portfolio_resume_id, github_url, website_url, twitter_url, contact_email, portfolio_theme, views')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  if (data) {
    return {
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      jobTitle: data.job_title,
      industry: data.industry,
      careerLevel: data.career_level as CareerLevel | null,
      location: data.location,
      linkedinUrl: data.linkedin_url,
      profileCompleted: data.profile_completed ?? false,
      username: (data as Record<string, unknown>).username as string | null,
      portfolioBio: (data as Record<string, unknown>).portfolio_bio as string | null,
      portfolioEnabled: ((data as Record<string, unknown>).portfolio_enabled as boolean) ?? false,
      portfolioResumeId: (data as Record<string, unknown>).portfolio_resume_id as string | null,
      githubUrl: (data as Record<string, unknown>).github_url as string | null,
      websiteUrl: (data as Record<string, unknown>).website_url as string | null,
      twitterUrl: (data as Record<string, unknown>).twitter_url as string | null,
      contactEmail: (data as Record<string, unknown>).contact_email as string | null,
      theme: (data as Record<string, unknown>).portfolio_theme as string | null,
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
    staleTime: 5 * 60 * 1000, // 5 minutes - matches resume query
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!userId) throw new Error('No user ID');

      const dbUpdates: Record<string, unknown> = {
        user_id: userId,
        full_name: updates.fullName !== undefined ? updates.fullName : profile?.fullName ?? null,
        avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : profile?.avatarUrl ?? null,
        job_title: updates.jobTitle !== undefined ? updates.jobTitle : profile?.jobTitle ?? null,
        industry: updates.industry !== undefined ? updates.industry : profile?.industry ?? null,
        career_level: updates.careerLevel !== undefined ? updates.careerLevel : profile?.careerLevel ?? null,
        location: updates.location !== undefined ? updates.location : profile?.location ?? null,
        linkedin_url: updates.linkedinUrl !== undefined ? updates.linkedinUrl : profile?.linkedinUrl ?? null,
        profile_completed: updates.profileCompleted !== undefined ? updates.profileCompleted : profile?.profileCompleted ?? false,
        username: updates.username !== undefined ? updates.username : profile?.username ?? null,
        portfolio_bio: updates.portfolioBio !== undefined ? updates.portfolioBio : profile?.portfolioBio ?? null,
        portfolio_enabled: updates.portfolioEnabled !== undefined ? updates.portfolioEnabled : profile?.portfolioEnabled ?? false,
        portfolio_resume_id: updates.portfolioResumeId !== undefined ? updates.portfolioResumeId : profile?.portfolioResumeId ?? null,
        github_url: updates.githubUrl !== undefined ? updates.githubUrl : profile?.githubUrl ?? null,
        website_url: updates.websiteUrl !== undefined ? updates.websiteUrl : profile?.websiteUrl ?? null,
        twitter_url: updates.twitterUrl !== undefined ? updates.twitterUrl : profile?.twitterUrl ?? null,
        contact_email: updates.contactEmail !== undefined ? updates.contactEmail : profile?.contactEmail ?? null,
        portfolio_theme: updates.theme !== undefined ? updates.theme : profile?.theme ?? null,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(dbUpdates as any, { onConflict: 'user_id' });

      return updates;
    },
    onSuccess: (updates) => {
      // Optimistically update the cache
      queryClient.setQueryData(['profile', userId], (old: Profile | null) => 
        old ? { ...old, ...updates } : updates as Profile
      );
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
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
