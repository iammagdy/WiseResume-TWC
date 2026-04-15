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
  slug: string | null;
  published: boolean;
  location: string | null;
  remote_ok: boolean;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string | null;
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
        .select('id, title, jd_text, status, slug, published, location, remote_ok, salary_min, salary_max, employment_type, created_at, updated_at')
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
      toast.success('Job description deleted.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete JD');
    },
  });

  const publishRole = useMutation({
    mutationFn: async ({
      roleId,
      published,
      slug,
      location,
      remote_ok,
      salary_min,
      salary_max,
      employment_type,
    }: {
      roleId: string;
      published: boolean;
      slug?: string;
      location?: string;
      remote_ok?: boolean;
      salary_min?: number | null;
      salary_max?: number | null;
      employment_type?: string;
    }) => {
      const updates: Record<string, unknown> = { published };
      if (slug !== undefined) updates.slug = slug;
      if (location !== undefined) updates.location = location;
      if (remote_ok !== undefined) updates.remote_ok = remote_ok;
      if (salary_min !== undefined) updates.salary_min = salary_min;
      if (salary_max !== undefined) updates.salary_max = salary_max;
      if (employment_type !== undefined) updates.employment_type = employment_type;

      const { error } = await supabase
        .from('wisehire_roles')
        .update(updates)
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success(vars.published ? 'Role published to job board.' : 'Role unpublished.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    },
  });

  return { ...query, saveJD, createRole, deleteJD, publishRole };
}
