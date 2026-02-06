import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
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
    profile.linkedinUrl,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export function useProfile(userId: string | undefined, user?: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, job_title, industry, career_level, location, linkedin_url, profile_completed')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          setLoading(false);
          return;
        }

        if (data) {
          // Profile exists, use it
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
        } else {
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
          };

          // Create the row via upsert
          const { error: upsertError } = await supabase.from('profiles').upsert(
            {
              user_id: userId,
              full_name: defaultFullName,
              avatar_url: defaultAvatarUrl,
            },
            { onConflict: 'user_id' }
          );

          if (upsertError) {
            console.error('Error creating profile:', upsertError);
          }

          setProfile(defaultProfile);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return;

    // Build database updates object with user_id for upsert
    const dbUpdates = {
      user_id: userId,
      full_name: updates.fullName !== undefined ? updates.fullName : profile?.fullName ?? null,
      avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : profile?.avatarUrl ?? null,
      job_title: updates.jobTitle !== undefined ? updates.jobTitle : profile?.jobTitle ?? null,
      industry: updates.industry !== undefined ? updates.industry : profile?.industry ?? null,
      career_level: updates.careerLevel !== undefined ? updates.careerLevel : profile?.careerLevel ?? null,
      location: updates.location !== undefined ? updates.location : profile?.location ?? null,
      linkedin_url: updates.linkedinUrl !== undefined ? updates.linkedinUrl : profile?.linkedinUrl ?? null,
      profile_completed: updates.profileCompleted !== undefined ? updates.profileCompleted : profile?.profileCompleted ?? false,
    };

    // Use UPSERT instead of UPDATE to ensure row exists
    const { error } = await supabase
      .from('profiles')
      .upsert(dbUpdates, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to update profile');
      throw error;
    }

    setProfile((prev) => prev ? { ...prev, ...updates } : (updates as Profile));
    toast.success('Profile updated successfully');
  }, [userId, profile]);

  return { profile, loading, updateProfile };
}
