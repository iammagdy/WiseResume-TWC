import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

export interface ResumeRow {
  id: string;
  user_id: string;
  title: string | null;
  template_key: string | null;
  updated_at: string;
  created_at: string;
  data: unknown;
}

export function useResumes() {
  const userId = useAuthStore((s) => s.identity?.userId);
  return useQuery({
    queryKey: ['resumes', userId],
    enabled: !!userId,
    queryFn: async () =>
      rest<ResumeRow[]>('resumes', {
        method: 'GET',
        select: '*',
        query: { user_id: `eq.${userId}`, order: 'updated_at.desc' },
      }),
  });
}

export function useResume(id: string | null) {
  const userId = useAuthStore((s) => s.identity?.userId);
  return useQuery({
    queryKey: ['resume', id],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const rows = await rest<ResumeRow[]>('resumes', {
        method: 'GET',
        select: '*',
        query: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: 1 },
      });
      return rows[0] ?? null;
    },
  });
}

export function useUpdateResume(id: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.identity?.userId);
  return useMutation({
    mutationFn: async (patch: Partial<ResumeRow>) => {
      return rest<ResumeRow[]>('resumes', {
        method: 'PATCH',
        body: patch,
        query: { id: `eq.${id}`, user_id: `eq.${userId}` },
        select: '*',
        extraHeaders: { Prefer: 'return=representation' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resume', id] });
      qc.invalidateQueries({ queryKey: ['resumes', userId] });
    },
  });
}
