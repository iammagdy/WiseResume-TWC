import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TalentSearchFilters } from './useTalentPool';
import type { Models } from 'appwrite';

export interface SavedSearch {
  id: string;
  name: string;
  filters: TalentSearchFilters;
  created_at: string;
}

function docToSearch(doc: Models.Document): SavedSearch {
  return {
    id: doc.$id,
    name: doc.name as string,
    filters: (doc.filters ?? {}) as TalentSearchFilters,
    created_at: doc.created_at as string,
  };
}

export function useSavedSearches() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-saved-searches', userId],
    queryFn: async (): Promise<SavedSearch[]> => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_saved_searches, [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(200),
      ]);
      return res.documents.map(docToSearch);
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60_000,
  });

  const saveSearch = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: TalentSearchFilters }) => {
      if (!userId) throw new Error('Not authenticated');
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_saved_searches,
        ID.unique(),
        { owner_id: userId, name, filters },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-saved-searches', userId] });
      toast.success('Search saved.');
    },
    onError: () => toast.error('Failed to save search.'),
  });

  const deleteSearch = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.wisehire_saved_searches, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-saved-searches', userId] });
      toast.success('Search removed.');
    },
    onError: () => toast.error('Failed to remove search.'),
  });

  return { ...query, saveSearch, deleteSearch };
}
