import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

export interface WiseHireRole {
  id: string;
  title: string;
  jd_text: string | null;
  status: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useJDs() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-jds', userId],
    queryFn: async (): Promise<WiseHireRole[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('wisehire_roles')
        .select('id, title, jd_text, status, client_id, created_at, updated_at')
        .eq('owner_id', userId)
        .eq('is_deleted', false)
        .not('jd_text', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('[useJDs] fetch error:', error.message);
        return [];
      }
      return (data ?? []) as WiseHireRole[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60 * 1000,
  });

  const saveJD = useMutation({
    mutationFn: async ({ roleId, jdText }: { roleId: string; jdText: string }) => {
      const { error } = await supabase
        .from('wisehire_roles')
        .update({ jd_text: jdText, status: 'draft' })
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Job description saved.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save JD');
    },
  });

  const createRole = useMutation({
    mutationFn: async ({ title, jdText }: { title: string; jdText?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wisehire_roles')
        .insert({
          owner_id: userId,
          title,
          jd_text: jdText ?? null,
          status: 'draft',
          is_deleted: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create role');
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      roleId,
      updates,
    }: {
      roleId: string;
      updates: Partial<Pick<WiseHireRole, 'title' | 'status' | 'client_id'>>;
    }) => {
      const { error } = await supabase
        .from('wisehire_roles')
        .update(updates)
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    },
  });

  const deleteJD = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('wisehire_roles')
        .update({ is_deleted: true })
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      toast.success('Job description deleted.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete JD');
    },
  });

  return { ...query, saveJD, createRole, updateRole, deleteJD };
}
