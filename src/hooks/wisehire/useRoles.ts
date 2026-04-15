import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { toast } from 'sonner';

export interface RoleWithStats {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  jd_text: string | null;
  created_at: string;
  updated_at: string;
  candidate_count: number;
  active_count: number;
}

export const ROLE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'active', label: 'Active', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'on_hold', label: 'On Hold', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'filled', label: 'Filled', color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
];

export function useRoles() {
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-roles-all', userId],
    queryFn: async (): Promise<RoleWithStats[]> => {
      if (!userId) return [];

      const [rolesRes, candidatesRes] = await Promise.all([
        supabase
          .from('wisehire_roles')
          .select('id, title, status, client_id, jd_text, created_at, updated_at')
          .eq('owner_id', userId)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false }),
        supabase
          .from('wisehire_candidates')
          .select('role_id, pipeline_stage')
          .eq('owner_id', userId),
      ]);

      const roles = rolesRes.data ?? [];
      const candidates = candidatesRes.data ?? [];

      const countMap: Record<string, number> = {};
      const activeMap: Record<string, number> = {};
      for (const c of candidates) {
        if (!c.role_id) continue;
        countMap[c.role_id] = (countMap[c.role_id] ?? 0) + 1;
        if (c.pipeline_stage !== 'rejected') {
          activeMap[c.role_id] = (activeMap[c.role_id] ?? 0) + 1;
        }
      }

      return roles.map((r) => ({
        ...(r as RoleWithStats),
        candidate_count: countMap[r.id] ?? 0,
        active_count: activeMap[r.id] ?? 0,
      }));
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60 * 1000,
  });

  const updateRole = useMutation({
    mutationFn: async ({
      roleId,
      updates,
    }: {
      roleId: string;
      updates: Partial<Pick<RoleWithStats, 'title' | 'status' | 'client_id'>>;
    }) => {
      const { error } = await supabase
        .from('wisehire_roles')
        .update(updates)
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    },
  });

  const createRole = useMutation({
    mutationFn: async ({ title, clientId }: { title: string; clientId?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wisehire_roles')
        .insert({
          owner_id: userId,
          title,
          status: 'draft',
          client_id: clientId ?? null,
          is_deleted: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Role created.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create role');
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('wisehire_roles')
        .update({ is_deleted: true })
        .eq('id', roleId)
        .eq('owner_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Role archived.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive role');
    },
  });

  return { ...query, updateRole, createRole, deleteRole };
}
