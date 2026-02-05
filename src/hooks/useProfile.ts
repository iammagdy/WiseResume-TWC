import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, profile_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile({
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          jobTitle: data.job_title,
          industry: data.industry,
          careerLevel: data.career_level as CareerLevel | null,
          location: data.location,
          linkedinUrl: data.linkedin_url,
          profileCompleted: data.profile_completed ?? false,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
    if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
    if (updates.careerLevel !== undefined) dbUpdates.career_level = updates.careerLevel;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
    if (updates.profileCompleted !== undefined) dbUpdates.profile_completed = updates.profileCompleted;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update profile');
      throw error;
    }

    setProfile((prev) => prev ? { ...prev, ...updates } : null);
    toast.success('Profile updated successfully');
  }, [userId]);

  return { profile, loading, updateProfile };
}
