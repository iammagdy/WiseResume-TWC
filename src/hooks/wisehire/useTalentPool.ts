import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
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
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) {
    const e = new Error(data.error) as Error & { status?: number };
    e.status = data.status ?? 500;
    throw e;
  }
  return data as T;
}

export function useTalentSearch(filters: TalentSearchFilters, enabled = true) {
  const { isAuthenticated, supabaseReady } = useAuth();
  return useQuery({
    queryKey: ['talent-search', filters],
    queryFn: () =>
      callEdge<{ results: TalentProfile[]; total: number }>('wisehire-talent-search', filters),
    enabled: enabled && isAuthenticated && supabaseReady,
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
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('wisehire_candidates')
        .select('id')
        .eq('owner_id', userId)
        .eq('full_name', profile.full_name ?? '')
        .limit(1)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from('wisehire_candidates')
        .insert({
          owner_id: userId,
          role_id: roleId ?? null,
          full_name: profile.full_name ?? 'Talent Pool Candidate',
          email: null,
          pipeline_stage: stage,
          resume_text: `Headline: ${profile.headline ?? ''}\nSkills: ${(profile.skills ?? []).join(', ')}\nExperience: ${profile.experience_level ?? ''}\nAvailability: ${profile.availability ?? ''}\nLocation: ${profile.location ?? ''}`,
          source: 'talent_pool',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Candidate added to pipeline');
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to add candidate');
    },
  });
}
