import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface OutreachEmail {
  id: string;
  candidate_id: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'saved';
  resend_message_id: string | null;
  created_at: string;
}

async function callEdge<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) {
    const e = new Error(data.error) as Error & { status?: number };
    e.status = 429;
    throw e;
  }
  return data as T;
}

export function useOutreachHistory(candidateId: string | undefined) {
  const { isAuthenticated, supabaseReady } = useAuth();
  return useQuery({
    queryKey: ['outreach-history', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from('wisehire_outreach_emails')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OutreachEmail[];
    },
    enabled: isAuthenticated && supabaseReady && !!candidateId,
    staleTime: 30_000,
  });
}

export function useAIDraftOutreach() {
  return useMutation({
    mutationFn: ({
      candidate_id,
      candidate_name,
      role_title,
    }: {
      candidate_id: string;
      candidate_name?: string;
      role_title?: string;
    }) =>
      callEdge<{ draft: string }>('wisehire-send-outreach', {
        candidate_id,
        candidate_name,
        role_title,
        ai_draft: true,
      }),
  });
}

export function useSendOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidate_id,
      to_email,
      subject,
      body,
    }: {
      candidate_id: string;
      to_email: string;
      subject: string;
      body: string;
    }) =>
      callEdge<{ ok: boolean; status: string; id: string; remaining: number }>('wisehire-send-outreach', {
        candidate_id,
        to_email,
        subject,
        body,
      }),
    onSuccess: (data, vars) => {
      toast.success(
        data.status === 'sent'
          ? 'Email sent successfully.'
          : 'Email saved (Resend not configured — email not delivered).',
      );
      qc.invalidateQueries({ queryKey: ['outreach-history', vars.candidate_id] });
    },
    onError: (err: Error & { status?: number }) => {
      if (err.message?.includes('limit')) {
        toast.error('Daily outreach limit reached. Upgrade to Pro for more.');
      } else if (err.message?.includes('RESEND_API_KEY') || err.message?.includes('not configured')) {
        toast.error('Email delivery not configured', {
          description: 'The RESEND_API_KEY secret is missing. Contact your administrator to enable email sending.',
        });
      } else {
        toast.error('Failed to send email. Please try again.');
      }
    },
  });
}
