import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface TalentPoolProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  headline: string | null;
  skills: string[];
  experience_level: string | null;
  availability: string;
  location: string | null;
  remote_ok: boolean;
  opted_in: boolean;
  opted_in_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
}

export interface TalentPoolProfileUpdate {
  full_name?: string;
  headline?: string;
  skills?: string[];
  experience_level?: string;
  availability?: string;
  location?: string;
  remote_ok?: boolean;
  opted_in?: boolean;
}

function docToProfile(doc: Models.Document): TalentPoolProfile {
  return { ...doc, id: doc.$id } as unknown as TalentPoolProfile;
}

export function useMyTalentProfile() {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['talent-pool-profile-me', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.talent_pool_profiles, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);
      return res.total > 0 ? docToProfile(res.documents[0]) : null;
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });
}

export function useMyTalentViews() {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['talent-pool-views-me', userId],
    queryFn: async () => {
      if (!userId) return [];
      const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.talent_pool_profiles, [
        Query.equal('user_id', userId),
        Query.limit(1),
        Query.select(['$id']),
      ]);
      if (profileRes.total === 0) return [];
      const profileId = profileRes.documents[0].$id;
      const viewsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.talent_pool_views, [
        Query.equal('profile_id', profileId),
        Query.orderDesc('viewed_at'),
        Query.limit(50),
      ]);
      return viewsRes.documents.map((d) => ({ id: d.$id, viewed_at: d.viewed_at as string }));
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 30_000,
  });
}

export function useUpsertTalentProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: TalentPoolProfileUpdate) => {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      const payload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.opted_in === true) {
        payload.opted_in_at = new Date().toISOString();
      } else if (updates.opted_in === false) {
        payload.opted_in_at = null;
      }

      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.talent_pool_profiles, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (existing.total > 0) {
        const doc = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.talent_pool_profiles,
          existing.documents[0].$id,
          payload,
        );
        return docToProfile(doc);
      } else {
        const doc = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.talent_pool_profiles,
          ID.unique(),
          { user_id: userId, ...payload },
        );
        return docToProfile(doc);
      }
    },
    onSuccess: () => {
      const userId = user?.id;
      qc.invalidateQueries({ queryKey: ['talent-pool-profile-me', userId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update profile');
    },
  });
}
