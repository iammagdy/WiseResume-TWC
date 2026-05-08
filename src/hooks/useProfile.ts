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
}

export function calculateProfileCompletion(profile: Profile | null): number {
  if (!profile) return 0;
  const fields: (keyof Profile)[] = ['fullName', 'jobTitle', 'industry', 'careerLevel', 'location'];
  const filled = fields.filter(f => !!profile[f]).length;
  return (filled / fields.length) * 100;
}

export function useProfile(userId: string | undefined, initialData?: any) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const response = await databases.listDocuments(DATABASE_ID, 'profiles', [
          Query.equal('user_id', userId)
        ]);
        if (response.total === 0) return null;
        
        const doc = response.documents[0];
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
          profileCompleted: !!doc.profile_completed,
          username: doc.username,
          portfolioBio: doc.portfolio_bio,
          portfolioEnabled: !!doc.portfolio_enabled,
          onboarding_completed: !!doc.onboarding_completed
        } as Profile;
      } catch (err) {
        return null;
      }
    },
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!userId) throw new Error('Identity not settled');

      const existing = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.equal('user_id', userId)
      ]);

      const data: any = {};
      if (updates.fullName !== undefined) data.full_name = updates.fullName;
      if (updates.jobTitle !== undefined) data.job_title = updates.jobTitle;
      if (updates.industry !== undefined) data.industry = updates.industry;
      if (updates.careerLevel !== undefined) data.career_level = updates.careerLevel;
      if (updates.location !== undefined) data.location = updates.location;
      if (updates.onboarding_completed !== undefined) data.onboarding_completed = updates.onboarding_completed;

      if (existing.total > 0) {
        await databases.updateDocument(DATABASE_ID, 'profiles', existing.documents[0].$id, data);
      } else {
        await databases.createDocument(DATABASE_ID, 'profiles', ID.unique(), {
          ...data,
          user_id: userId,
          email: profile?.email || user?.email
        });
      }
      return updates;
    },
    onSuccess: (updates) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Profile updated');
    },
  });

  return { profile, loading, updateProfile: updateMutation.mutateAsync };
}
