import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';

export interface ResumeVersion {
  id: string;
  resume_id: string;
  user_id: string;
  version_number: number;
  snapshot: ResumeData;
  change_summary: string | null;
  created_at: string;
}

export function useResumeVersions(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume-versions', resumeId],
    queryFn: async () => {
      if (!resumeId) return [];
      const { data, error } = await supabase
        .from('resume_versions')
        .select('*')
        .eq('resume_id', resumeId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        snapshot: v.snapshot as unknown as ResumeData,
      })) as ResumeVersion[];
    },
    enabled: !!user && !!resumeId,
  });
}

export function useResumeVersionMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveVersion = useMutation({
    mutationFn: async ({
      resumeId,
      snapshot,
      changeSummary,
    }: {
      resumeId: string;
      snapshot: ResumeData;
      changeSummary?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get the latest version number
      const { data: latest } = await supabase
        .from('resume_versions')
        .select('version_number')
        .eq('resume_id', resumeId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latest?.version_number || 0) + 1;

      const insertData = {
        resume_id: resumeId,
        user_id: user.id,
        version_number: nextVersion,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        change_summary: changeSummary || null,
      };

      const { data, error } = await supabase
        .from('resume_versions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resume-versions', variables.resumeId] });
    },
  });

  const deleteVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('resume_versions')
        .delete()
        .eq('id', versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-versions'] });
      toast.success('Version deleted');
    },
  });

  return { saveVersion, deleteVersion };
}
