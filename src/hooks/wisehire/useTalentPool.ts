import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TalentProfile {
  id: string;
  full_name: string | null;
  headline: string | null;
  skills: string[];
  experience_level: string | null;
  availability: string | null;
  location: string | null;
  remote_ok: boolean;
  profile_slug: string | null;
  view_count: number;
  opted_in_at: string | null;
}

export interface TalentSearchFilters {
  query?: string;
  skills?: string[];
  experience_level?: string;
  availability?: string;
  remote_ok?: boolean;
  limit?: number;
  offset?: number;
}

async function callEdge<T>(name: string, body: object): Promise<T> {
  const { data, error } = await appwriteFunctions.invoke<T>(name, { body });
  if (error) {
    const e = new Error((error as { message?: string }).message ?? 'Request failed') as Error & { status?: number };
    e.status = (error as { status?: number }).status;
    throw e;
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const e = new Error((data as Record<string, unknown>).error as string) as Error & { status?: number };
    e.status = (data as Record<string, unknown>).status as number | undefined ?? 500;
    throw e;
  }
  return data as T;
}

export function useTalentSearch(filters: TalentSearchFilters, enabled = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['talent-search', filters],
    queryFn: () =>
      callEdge<{ results: TalentProfile[]; total: number; remaining?: number }>('wisehire-talent-search', filters),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useRecordTalentView() {
  return useMutation({
    mutationFn: (profile_id: string) =>
      callEdge('wisehire-talent-view', { profile_id }),
    onError: () => {},
  });
}

export function useAddTalentToPool() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      profile,
      roleId,
      stage = 'shortlisted',
    }: {
      profile: TalentProfile;
      roleId?: string;
      stage?: string;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidates, [
        Query.equal('owner_id', userId),
        Query.equal('name', profile.full_name ?? ''),
        Query.limit(1),
      ]);

      if (existing.total > 0) {
        return { id: existing.documents[0].$id, userId };
      }

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_candidates,
        ID.unique(),
        {
          owner_id: userId,
          role_id: roleId ?? null,
          name: profile.full_name ?? 'Talent Pool Candidate',
          email: null,
          pipeline_stage: stage,
          resume_text: `Headline: ${profile.headline ?? ''}\nSkills: ${(profile.skills ?? []).join(', ')}\nExperience: ${profile.experience_level ?? ''}\nAvailability: ${profile.availability ?? ''}\nLocation: ${profile.location ?? ''}`,
          source: 'talent_pool',
          is_deleted: false,
        },
      );

      return { id: doc.$id, userId };
    },
    onSuccess: ({ userId }) => {
      toast.success('Candidate added to pipeline');
      qc.invalidateQueries({ queryKey: ['wisehire-pipeline', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-dashboard-stats', userId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to add candidate');
    },
  });
}
