import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WiseHireClient {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-clients', userId],
    queryFn: async (): Promise<WiseHireClient[]> => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_clients, [
        Query.equal('owner_id', userId),
        Query.equal('is_deleted', false),
        Query.orderAsc('name'),
        Query.limit(500),
      ]);
      return res.documents.map((d) => ({ ...d, id: d.$id } as unknown as WiseHireClient));
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60_000,
  });

  const createClient = useMutation({
    mutationFn: async (input: { name: string; contact_name?: string; contact_email?: string; notes?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_clients,
        ID.unique(),
        { owner_id: userId, ...input },
      );
      return doc.$id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client added.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to add client'),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WiseHireClient> & { id: string }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_clients, id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client updated.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update client'),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_clients, id, { is_deleted: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client removed.');
    },
    onError: () => toast.error('Failed to remove client'),
  });

  return { ...query, createClient, updateClient, deleteClient };
}
