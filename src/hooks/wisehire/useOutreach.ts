import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from '@/hooks/useAuth';
import { useAIAction } from '@/hooks/useAIAction';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

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

function docToEmail(doc: Models.Document): OutreachEmail {
  return { ...doc, id: doc.$id } as unknown as OutreachEmail;
}

async function callEdge<T>(name: string, body: object): Promise<T> {
  const { data, error } = await appwriteFunctions.invoke<T>(name, { body });
  if (error) {
    const e = new Error((error as { message?: string }).message ?? 'Request failed') as Error & { status?: number };
    e.status = (error as { status?: number }).status;
    throw e;
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const e = new Error((data as Record<string, unknown>).error as string) as Error & { status?: number };
    e.status = 429;
    throw e;
  }
  return data as T;
}

export function useOutreachHistory(candidateId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['outreach-history', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_outreach_emails, [
        Query.equal('candidate_id', candidateId),
        Query.orderDesc('created_at'),
      ]);
      return res.documents.map(docToEmail);
    },
    enabled: isAuthenticated && !!candidateId,
    staleTime: 30_000,
  });
}

export function useAIDraftOutreach() {
  const { execute: executeAI } = useAIAction({ operation: 'wisehire_outreach_draft' });
  return useMutation({
    mutationFn: async ({
      candidate_id,
      role_title,
    }: {
      candidate_id: string;
      role_title?: string;
    }) => {
      const result = await executeAI(() => callEdge<{ draft: string }>('wisehire-send-outreach', {
        candidate_id,
        role_title,
        ai_draft: true,
      }));
      if (!result) throw Object.assign(new Error('AI draft was not started.'), { code: 'cancelled' });
      return result;
    },
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
      callEdge<{ ok: boolean; status: string; id: string; remaining: number | null }>('wisehire-send-outreach', {
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
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: ['outreach-history', vars.candidate_id] });
    },
  });
}
