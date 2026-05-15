import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResignationLetter {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  tone: string | null;
  company: string | null;
  job_title: string | null;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResignationLetterInput {
  title?: string | null;
  content: string;
  tone?: string | null;
  company?: string | null;
  job_title?: string | null;
  effective_date?: string | null;
}

export interface ResignationLetterUpdates {
  title?: string | null;
  content?: string;
  tone?: string | null;
  company?: string | null;
  job_title?: string | null;
  effective_date?: string | null;
}

function docToLetter(doc: Record<string, unknown>): ResignationLetter {
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    title: (doc.title as string | null) ?? null,
    content: doc.content as string,
    tone: (doc.tone as string | null) ?? null,
    company: (doc.company as string | null) ?? null,
    job_title: (doc.job_title as string | null) ?? null,
    effective_date: (doc.effective_date as string | null) ?? null,
    created_at: doc.$createdAt as string,
    updated_at: doc.$updatedAt as string,
  };
}

export function useResignationLetters() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resignation-letters', user?.id],
    queryFn: async (): Promise<ResignationLetter[]> => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'resignation_letters', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
        Query.limit(500),
      ]);
      return response.documents.map(d => docToLetter(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useResignationLetter(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resignation-letter', id],
    queryFn: async (): Promise<ResignationLetter | null> => {
      if (!user || !id) return null;
      const doc = await databases.getDocument(DATABASE_ID, 'resignation_letters', id);
      return docToLetter(doc as unknown as Record<string, unknown>);
    },
    enabled: !!user && !!id,
  });
}

export function useResignationLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveLetter = useMutation({
    mutationFn: async (input: ResignationLetterInput): Promise<ResignationLetter> => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'resignation_letters', ID.unique(), {
        user_id: user.id,
        ...input,
      });
      return docToLetter(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter saved!');
    },
  });

  const updateLetter = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ResignationLetterUpdates }): Promise<ResignationLetter> => {
      const doc = await databases.updateDocument(DATABASE_ID, 'resignation_letters', id, updates);
      return docToLetter(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter updated');
    },
  });

  const deleteLetter = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await databases.deleteDocument(DATABASE_ID, 'resignation_letters', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter deleted');
    },
  });

  return { saveLetter, updateLetter, deleteLetter };
}
