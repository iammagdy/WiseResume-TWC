import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
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

export function parseCoverLetter(doc: any): CoverLetterRecord {
  return {
    id: doc.$id,
    user_id: doc.user_id,
    title: doc.title,
    job_title: doc.job_title,
    company: doc.company,
    content: doc.content,
    tone: doc.tone,
    template_style: doc.template_style,
    resume_id: doc.resume_id,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt
  };
}

export function useCoverLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cover-letters', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'cover_letters', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt')
      ]);
      return response.documents.map(parseCoverLetter);
    },
    enabled: !!user,
  });
}

export function useCoverLetter(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cover-letters', id],
    queryFn: async () => {
      if (!user || !id) return null;
      const doc = await databases.getDocument(DATABASE_ID, 'cover_letters', id);
      return parseCoverLetter(doc);
    },
    enabled: !!user && !!id,
  });
}

export function useCoverLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveCoverLetter = useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'cover_letters', ID.unique(), {
        user_id: user.id,
        ...input
      });
      return parseCoverLetter(doc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter saved!');
    },
  });

  const deleteCoverLetter = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, 'cover_letters', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      toast.success('Cover letter deleted');
    },
  });

  return { saveCoverLetter, deleteCoverLetter };
}
