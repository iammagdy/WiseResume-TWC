import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResignationLetterRecord {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export function parseResignationLetter(doc: any): ResignationLetterRecord {
  return {
    id: doc.$id,
    user_id: doc.user_id,
    title: doc.title,
    content: doc.content,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt
  };
}

export function useResignationLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resignation-letters', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'resignation_letters', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt')
      ]);
      return response.documents.map(parseResignationLetter);
    },
    enabled: !!user,
  });
}

export function useResignationLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveLetter = useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(DATABASE_ID, 'resignation_letters', ID.unique(), {
        user_id: user.id,
        ...input
      });
      return parseResignationLetter(doc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Resignation letter saved!');
    },
  });

  return { saveLetter };
}
