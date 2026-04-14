import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export interface InterviewReportData {
  summary: string;
  duration: number;
  scores: Array<{ questionIndex: number; score: number; tip: string; improvedAnswer: string }>;
  overallScore: number | null;
  transcript?: Array<{ id: string; role: string; text: string; timestamp: string }>;
  candidateName?: string;
  interviewType?: string;
  createdAt: string;
}

export interface InterviewReportToken {
  id: string;
  user_id: string;
  session_id: string | null;
  token: string;
  report_data: InterviewReportData;
  expires_at: string;
  created_at: string;
}

/** Public lookup: uses the token-scoped RPC to avoid exposing unrelated rows to anon clients. */
export function useInterviewReportToken(token: string | undefined) {
  return useQuery({
    queryKey: ['interview-report-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      const { data, error } = await supabase
        .rpc('get_interview_report', { p_token: token });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error('Report not found or has expired');
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row as InterviewReportToken;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useCreateInterviewReportToken() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      session_id?: string;
      report_data: InterviewReportData;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from('interview_report_tokens')
        .insert({
          user_id: user.id,
          session_id: input.session_id || null,
          token,
          report_data: input.report_data as unknown as Json,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as InterviewReportToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-report-token'] });
    },
    onError: () => toast.error('Failed to create shareable link'),
  });
}
