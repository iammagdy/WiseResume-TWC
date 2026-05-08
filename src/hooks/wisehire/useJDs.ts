import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WiseHireRole {
  id: string;
  company_id: string;
  title: string;
  jd_text: string | null;
  status: string;
  client_id: string | null;
  slug: string | null;
  published: boolean | null;
  location: string | null;
  remote_ok: boolean | null;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useJDs() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-jds', userId],
    queryFn: async (): Promise<WiseHireRole[]> => {
      if (!userId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_roles, [
        Query.equal('owner_id', userId),
        Query.equal('is_deleted', false),
        Query.isNotNull('jd_text'),
        Query.orderDesc('updated_at'),
        Query.limit(500),
      ]);
      return res.documents.map((d) => ({ ...d, id: d.$id } as unknown as WiseHireRole));
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });

  const saveJD = useMutation({
    mutationFn: async ({ roleId, jdText }: { roleId: string; jdText: string }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, roleId, {
        jd_text: jdText,
        status: 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Job description saved.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save JD');
    },
  });

  const createRole = useMutation({
    mutationFn: async ({ title, jdText }: { title: string; jdText?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_roles,
        ID.unique(),
        {
          owner_id: userId,
          title,
          jd_text: jdText ?? null,
          status: 'draft',
          is_deleted: false,
        },
      );
      return doc.$id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create role');
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      roleId,
      updates,
    }: {
      roleId: string;
      updates: Partial<Pick<WiseHireRole, 'title' | 'status' | 'client_id'>>;
    }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, roleId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    },
  });

  const deleteJD = useMutation({
    mutationFn: async (roleId: string) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, roleId, { is_deleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      queryClient.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      toast.success('Job description deleted.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete JD');
    },
  });

  return { ...query, saveJD, createRole, updateRole, deleteJD };
}
