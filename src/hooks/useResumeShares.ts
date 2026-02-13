import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
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
      const { data, error } = await supabase
        .from('resume_shares')
        .select('*')
        .eq('resume_id', resumeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ResumeShare[];
    },
    enabled: !!user && !!resumeId,
  });
}

export function usePublicResume(token: string | null) {
  return useQuery({
    queryKey: ['public-resume', token],
    queryFn: async () => {
      // Use security definer function to bypass RLS
      const { data, error } = await supabase.rpc('get_shared_resume', {
        share_token: token!,
      });
      if (error) throw error;
      if (!data) throw new Error('Share link not found or expired');

      return data as { share: { resume_id: string; is_active: boolean; expires_at: string | null; password: string | null; view_count: number }; resume: any };
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
      const { data, error } = await supabase
        .from('resume_shares')
        .insert({
          resume_id: input.resumeId,
          user_id: user.id,
          token,
          password: input.password || null,
          expires_at: input.expires_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResumeShare;
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
      const { data, error } = await supabase
        .from('resume_shares')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResumeShare;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
    },
    onError: () => toast.error('Failed to update share'),
  });

  const deleteShare = useMutation({
    mutationFn: async ({ id, resumeId }: { id: string; resumeId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('resume_shares').delete().eq('id', id);
      if (error) throw error;
      return { resumeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resumeId] });
      toast.success('Share link removed');
    },
    onError: () => toast.error('Failed to delete share'),
  });

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
