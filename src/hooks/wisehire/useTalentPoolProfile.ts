import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

export function useMyTalentProfile() {
  const { isAuthenticated, supabaseReady } = useAuth();
  return useQuery({
    queryKey: ['talent-pool-profile-me'],
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from('talent_pool_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as TalentPoolProfile | null;
    },
    enabled: isAuthenticated && supabaseReady,
    staleTime: 60_000,
  });
}

export function useMyTalentViews() {
  const { isAuthenticated, supabaseReady } = useAuth();
  return useQuery({
    queryKey: ['talent-pool-views-me'],
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data: profile } = await supabase
        .from('talent_pool_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!profile) return [];
      const { data, error } = await supabase
        .from('talent_pool_views')
        .select('id, viewed_at')
        .eq('profile_id', profile.id)
        .order('viewed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAuthenticated && supabaseReady,
    staleTime: 30_000,
  });
}

export function useUpsertTalentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: TalentPoolProfileUpdate) => {
      const userId = await getUserId();
      if (!userId) throw new Error('Not authenticated');

      const payload: Record<string, unknown> = {
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.opted_in === true) {
        payload.opted_in_at = new Date().toISOString();
      } else if (updates.opted_in === false) {
        payload.opted_in_at = null;
      }

      const { data, error } = await supabase
        .from('talent_pool_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['talent-pool-profile-me'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update profile');
    },
  });
}
