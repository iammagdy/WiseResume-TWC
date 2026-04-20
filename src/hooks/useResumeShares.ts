import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResumeShare {
  id: string;
  resume_id: string;
  user_id: string;
  token: string;
  is_active: boolean;
  password: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function useResumeShares(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume-shares', resumeId, user?.id],
    queryFn: async () => {
      const { shares } = await apiFetch<{ shares: ResumeShare[] }>(
        '/api/data/resume-shares',
        { query: { resume_id: resumeId ?? undefined } },
      );
      return shares;
    },
    enabled: !!user && !!resumeId,
  });
}

export interface PublicShareResult {
  share: {
    resume_id: string;
    is_active: boolean;
    expires_at: string | null;
    view_count: number;
  };
  resume: Record<string, unknown>;
}

export interface PasswordRequiredResult {
  requires_password: true;
  authenticated: false;
}

export type PublicResumeResult = PublicShareResult | PasswordRequiredResult;

/**
 * Public-resume RPC has no equivalent /api/data/* endpoint yet, so this
 * query continues to call the legacy Supabase RPC. Once a server-side
 * `/api/share/:token` endpoint exists we can swap this over too.
 */
export function usePublicResume(token: string | null, passwordAttempt?: string) {
  return useQuery({
    queryKey: ['public-resume', token, passwordAttempt],
    queryFn: async (): Promise<PublicResumeResult> => {
      const { data, error } = await supabase.rpc('get_shared_resume', {
        share_token: token!,
        password_attempt: passwordAttempt ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('Share link not found or expired');

      return data as unknown as PublicResumeResult;
    },
    enabled: !!token,
  });
}

export function useResumeShareMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createShare = useMutation({
    mutationFn: async (input: {
      resumeId: string;
      password?: string;
      expires_at?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const token = generateToken();
      const { share } = await apiFetch<{ share: ResumeShare }>('/api/data/resume-shares', {
        method: 'POST',
        body: {
          resume_id: input.resumeId,
          token,
          password: input.password ?? null,
          expires_at: input.expires_at || null,
        },
      });
      return share;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
      toast.success('Share link created!');
    },
    onError: () => toast.error('Failed to create share link'),
  });

  const updateShare = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResumeShare> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { share } = await apiFetch<{ share: ResumeShare }>(`/api/data/resume-shares/${id}`, {
        method: 'PATCH',
        body: updates,
      });
      return share;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
    },
    onError: () => toast.error('Failed to update share'),
  });

  const deleteShare = useMutation({
    mutationFn: async ({ id, resumeId }: { id: string; resumeId: string }) => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch(`/api/data/resume-shares/${id}`, { method: 'DELETE' });
      return { resumeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resumeId] });
      toast.success('Share link removed');
    },
    onError: () => toast.error('Failed to delete share'),
  });

  /**
   * Public view-count increment still uses the legacy RPC because the public
   * share viewer is unauthenticated and so cannot use /api/data endpoints
   * (which require a session header). Migrate when a public-share endpoint is
   * added.
   */
  const incrementViewCount = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase.rpc('increment_share_view_count', {
        share_token: token,
      });
      if (error) throw error;
    },
  });

  return { createShare, updateShare, deleteShare, incrementViewCount };
}
