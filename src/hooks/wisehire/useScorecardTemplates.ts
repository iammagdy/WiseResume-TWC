import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export interface ScorecardTemplate {
  id: string;
  title: string;
  description: string | null;
  questions: string[];
  created_at: string;
  updated_at: string;
}

function docToTemplate(doc: Models.Document): ScorecardTemplate {
  return { ...doc, id: doc.$id } as unknown as ScorecardTemplate;
}

export function useScorecardTemplates() {
  const { isAuthenticated, supabaseReady, user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-scorecard-templates', userId],
    queryFn: async (): Promise<ScorecardTemplate[]> => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_scorecard_templates, [
        Query.equal('owner_id', userId),
        Query.orderDesc('created_at'),
        Query.limit(500),
      ]);
      return res.documents.map(docToTemplate);
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: { title: string; description?: string; questions: string[] }) => {
      if (!userId) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_scorecard_templates,
        ID.unique(),
        { owner_id: userId, ...input },
      );
      return doc.$id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template saved.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to save template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScorecardTemplate> & { id: string }) => {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_scorecard_templates,
        id,
        { ...updates, updated_at: new Date().toISOString() },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template updated.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.wisehire_scorecard_templates, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-scorecard-templates', userId] });
      toast.success('Template deleted.');
    },
    onError: () => toast.error('Failed to delete template'),
  });

  return { ...query, createTemplate, updateTemplate, deleteTemplate };
}
