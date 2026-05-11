import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type CareerLevel = 'entry' | 'mid' | 'senior' | 'executive';

export interface Profile {
  id?: string;
  user_id: string;
  email: string | null;
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
  onboarding_completed: boolean;
  updatedAt?: string;
}

export function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const fields = ['full_name', 'job_title', 'industry', 'career_level', 'location'];
  const filled = fields.filter(f => !!profile[f]).length;
  return (filled / fields.length) * 100;
}

export function getNextMissingField(profile: any): string | null {
    if (!profile) return 'fullName';
    if (!profile.full_name) return 'fullName';
    if (!profile.job_title) return 'jobTitle';
    if (!profile.industry) return 'industry';
    if (!profile.location) return 'location';
    return null;
}

export function useProfile(userId: string | undefined, initialData?: any) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', userId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;
      const response = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.equal('user_id', userId),
        Query.select(['$id', '$updatedAt', 'user_id', 'email', 'full_name', 'avatar_url', 'job_title', 'industry', 'career_level', 'location', 'linkedin_url', 'profile_completed', 'username', 'portfolio_bio', 'portfolio_enabled', 'onboarding_completed']),
      ]);
      const doc = response.documents[0];
      if (!doc) return null;

      // Map snake_case to camelCase for the UI
      return {
        id: doc.$id,
        user_id: doc.user_id,
        email: doc.email,
        fullName: doc.full_name,
        avatarUrl: doc.avatar_url,
        jobTitle: doc.job_title,
        industry: doc.industry,
        careerLevel: doc.career_level,
        location: doc.location,
        linkedinUrl: doc.linkedin_url,
        profileCompleted: doc.profile_completed ?? false,
        username: doc.username,
        portfolioBio: doc.portfolio_bio,
        portfolioEnabled: doc.portfolio_enabled ?? false,
        onboarding_completed: doc.onboarding_completed ?? false,
        updatedAt: doc.$updatedAt,
      } as Profile;
    },
    enabled: !!userId,
  });

  const updateProfile = async (updates: any) => {
    if (!userId) throw new Error('Identity not settled');
    const existing = await databases.listDocuments(DATABASE_ID, 'profiles', [Query.equal('user_id', userId)]);
    const data: any = {};
    if (updates.fullName !== undefined) data.full_name = updates.fullName;
    if (updates.jobTitle !== undefined) data.job_title = updates.jobTitle;
    if (updates.industry !== undefined) data.industry = updates.industry;
    if (updates.careerLevel !== undefined) data.career_level = updates.careerLevel;
    if (updates.location !== undefined) data.location = updates.location;
    if (updates.onboarding_completed !== undefined) data.onboarding_completed = updates.onboarding_completed;
    if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
    if (updates.linkedinUrl !== undefined) data.linkedin_url = updates.linkedinUrl;
    if (updates.profileCompleted !== undefined) data.profile_completed = updates.profileCompleted;
    if (updates.portfolioBio !== undefined) data.portfolio_bio = updates.portfolioBio;
    if (updates.portfolioEnabled !== undefined) data.portfolio_enabled = updates.portfolioEnabled;
    if (updates.username !== undefined) data.username = updates.username;

    if (existing.total > 0) {
      await databases.updateDocument(DATABASE_ID, 'profiles', existing.documents[0].$id, data);
    } else {
      await databases.createDocument(DATABASE_ID, 'profiles', ID.unique(), { ...data, user_id: userId, email: user?.email });
    }
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    toast.success('Profile updated');
  };

  return { profile, loading, updateProfile };
}

export const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 
  'Marketing', 'Sales', 'Real Estate', 'Logistics', 'Retail', 'Other'
];

export const CAREER_LEVEL_OPTIONS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid-Senior' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' }
];
