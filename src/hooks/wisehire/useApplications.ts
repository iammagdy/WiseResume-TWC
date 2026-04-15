import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WiseHireApplication {
  id: string;
  role_id: string;
  applicant_user_id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  cover_note: string | null;
  applied_at: string;
  role?: {
    id: string;
    title: string;
    slug: string | null;
    location: string | null;
    remote_ok: boolean;
    company?: { id: string; name: string; slug: string | null } | null;
  } | null;
}

export function useMyApplications() {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  return useQuery({
    queryKey: ['my-wisehire-applications', user?.id],
    queryFn: async (): Promise<WiseHireApplication[]> => {
      const { data, error } = await supabase
        .from('wisehire_applications')
        .select(`
          id, role_id, applicant_user_id, applicant_name, applicant_email,
          status, cover_note, applied_at,
          wisehire_roles!role_id(id, title, slug, location, remote_ok,
            wisehire_companies!company_id(id, name, slug)
          )
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((a: Record<string, unknown>) => ({
        ...a,
        role: a.wisehire_roles as WiseHireApplication['role'],
      })) as WiseHireApplication[];
    },
    enabled: isAuthenticated && supabaseReady,
    staleTime: 30_000,
  });
}

export function useHasApplied(roleId: string | undefined) {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  return useQuery({
    queryKey: ['has-applied', roleId, user?.id],
    queryFn: async () => {
      if (!roleId || !user?.id) return false;
      const { data } = await supabase
        .from('wisehire_applications')
        .select('id')
        .eq('role_id', roleId)
        .eq('applicant_user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: isAuthenticated && supabaseReady && !!roleId,
    staleTime: 30_000,
  });
}

export function useApplyToRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role_id, cover_note }: { role_id: string; cover_note?: string }) => {
      const { data, error } = await supabase.functions.invoke('wisehire-apply', {
        body: { role_id, cover_note },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: boolean; application_id: string };
    },
    onSuccess: (_, vars) => {
      toast.success('Application submitted! You\'ve been added to the hiring pipeline.');
      qc.invalidateQueries({ queryKey: ['my-wisehire-applications'] });
      qc.invalidateQueries({ queryKey: ['has-applied', vars.role_id] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to submit application. Please try again.');
    },
  });
}
