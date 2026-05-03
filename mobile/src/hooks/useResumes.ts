import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

/**
 * Mirrors the prod `public.resumes` row shape (verified 2026-05-03 against
 * Supabase project `jnsfmkzgxsviuthaqlyy` via Management API). The table
 * has NO `content`/`data` column — sections live in their own jsonb columns
 * (contact_info, summary, experience, education, skills, …). Mobile only
 * lists/edits the metadata fields plus `template_id`; the full editor
 * lives on the web. We expose the section columns optionally so callers
 * (e.g. mobile cover-letter generator) can pass the resume as a single
 * object to `generate-cover-letter`.
 */
export interface ResumeRow {
  id: string;
  user_id: string;
  title: string | null;
  template_id: string | null;
  updated_at: string;
  created_at: string;
  contact_info?: unknown;
  summary?: string | null;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  certifications?: unknown;
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
