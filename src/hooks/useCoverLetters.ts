import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CoverLetterRecord {
  id: string;
  user_id: string;
  title: string | null;
  job_title: string;
  company: string | null;
  content: string;
  tone: string | null;
  template_style: string | null;
  resume_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CoverLetterInput {
  title?: string | null;
  job_title: string;
  company?: string | null;
  content: string;
  tone?: string | null;
  template_style?: string | null;
  resume_id?: string | null;
}

export function parseCoverLetter(doc: Record<string, unknown>): CoverLetterRecord {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    title: (doc.title as string | null) ?? null,
    job_title: doc.job_title as string,
    company: (doc.company as string | null) ?? null,
    content: doc.content as string,
    tone: (doc.tone as string | null) ?? null,
    template_style: (doc.template_style as string | null) ?? null,
    resume_id: (doc.resume_id as string | null) ?? null,
    created_at: (doc.$createdAt as string) ?? null,
    updated_at: (doc.$updatedAt as string) ?? null,
  };
}

export function useCoverLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cover-letters', user?.id],
    queryFn: async (): Promise<CoverLetterRecord[]> => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.cover_letters, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
      ]);
      return response.documents.map(d => parseCoverLetter(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useCoverLetter(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cover-letters', id],
    queryFn: async (): Promise<CoverLetterRecord | null> => {
      if (!user || !id) return null;
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.cover_letters, id);
      return parseCoverLetter(doc as unknown as Record<string, unknown>);
    },
    enabled: !!user && !!id,
  });
}

export function useCoverLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveCoverLetter = useMutation({
    mutationFn: async (input: CoverLetterInput): Promise<CoverLetterRecord> => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.cover_letters, ID.unique(), {
        user_id: user.id,
        ...input,
      });
      return parseCoverLetter(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter saved!');
    },
  });

  const deleteCoverLetter = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.cover_letters, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter deleted');
    },
  });

  return { saveCoverLetter, deleteCoverLetter };
}
