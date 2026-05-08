import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
      return response.documents;
    },
    enabled: !!user,
  });
}

export function useResignationLetter(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resignation-letter', id],
    queryFn: async () => {
      if (!user || !id) return null;
      return await databases.getDocument(DATABASE_ID, 'resignation_letters', id);
    },
    enabled: !!user && !!id,
  });
}

export function useResignationLetterMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveLetter = useMutation({
    mutationFn: async (input: any) => {
      if (!user) throw new Error('Not authenticated');
      return await databases.createDocument(DATABASE_ID, 'resignation_letters', ID.unique(), {
        user_id: user.id,
        ...input
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter saved!');
    },
  });

  const updateLetter = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      return await databases.updateDocument(DATABASE_ID, 'resignation_letters', id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter updated');
    }
  });

  const deleteLetter = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, 'resignation_letters', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resignation-letters'] });
      toast.success('Letter deleted');
    }
  });

  return { saveLetter, updateLetter, deleteLetter };
}
