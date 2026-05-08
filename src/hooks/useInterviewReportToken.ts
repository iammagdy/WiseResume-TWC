import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

function docToToken(doc: Record<string, unknown>): InterviewReportToken {
  const raw = doc.report_data;
  const report_data: InterviewReportData =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as InterviewReportData);
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    session_id: (doc.session_id as string | null) ?? null,
    token: doc.token as string,
    report_data,
    expires_at: doc.expires_at as string,
    created_at: doc.$createdAt as string,
  };
}

/**
 * Public lookup by token — queries the interview_report_tokens collection
 * directly. No auth required; the token itself is the access credential.
 * Expired tokens are filtered out client-side.
 */
export function useInterviewReportToken(token: string | undefined) {
  return useQuery({
    queryKey: ['interview-report-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.interview_report_tokens, [
        Query.equal('token', token),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) throw new Error('Report not found or has expired');
      const doc = docToToken(res.documents[0] as unknown as Record<string, unknown>);
      if (new Date(doc.expires_at) < new Date()) throw new Error('Report not found or has expired');
      return doc;
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

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.interview_report_tokens,
        ID.unique(),
        {
          user_id: user.id,
          session_id: input.session_id ?? null,
          token,
          report_data: JSON.stringify(input.report_data),
          expires_at: expiresAt.toISOString(),
        },
      );
      return docToToken(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-report-token'] });
    },
    onError: () => toast.error('Failed to create shareable link'),
  });
}
