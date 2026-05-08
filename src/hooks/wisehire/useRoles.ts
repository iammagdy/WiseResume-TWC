import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RoleWithStats {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  jd_text: string | null;
  created_at: string;
  updated_at: string;
  candidate_count: number;
  active_count: number;
}

export const ROLE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'active', label: 'Active', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'on_hold', label: 'On Hold', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'filled', label: 'Filled', color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
];

export function useRoles() {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-roles-all', userId],
    queryFn: async (): Promise<RoleWithStats[]> => {
      if (!userId) return [];

      const [rolesRes, candidatesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_roles, [
          Query.equal('owner_id', userId),
          Query.equal('is_deleted', false),
          Query.orderDesc('updated_at'),
          Query.limit(500),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidates, [
          Query.equal('owner_id', userId),
          Query.select(['role_id', 'pipeline_stage']),
          Query.limit(5000),
        ]),
      ]);

      const countMap: Record<string, number> = {};
      const activeMap: Record<string, number> = {};
      for (const c of candidatesRes.documents) {
        const rId = c.role_id as string | null;
        if (!rId) continue;
        countMap[rId] = (countMap[rId] ?? 0) + 1;
        if (c.pipeline_stage !== 'rejected') {
          activeMap[rId] = (activeMap[rId] ?? 0) + 1;
        }
      }

      return rolesRes.documents.map((r) => ({
        ...r,
        id: r.$id,
        candidate_count: countMap[r.$id] ?? 0,
        active_count: activeMap[r.$id] ?? 0,
      } as unknown as RoleWithStats));
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });

  const updateRole = useMutation({
    mutationFn: async ({
      roleId,
      updates,
    }: {
      roleId: string;
      updates: Partial<Pick<RoleWithStats, 'title' | 'status' | 'client_id'>>;
    }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, roleId, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    },
  });

  const createRole = useMutation({
    mutationFn: async ({ title, clientId }: { title: string; clientId?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_roles,
        ID.unique(),
        {
          owner_id: userId,
          title,
          status: 'draft',
          client_id: clientId ?? null,
          is_deleted: false,
        },
      );
      return doc.$id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Role created.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create role');
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_roles, roleId, { is_deleted: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-roles-all', userId] });
      qc.invalidateQueries({ queryKey: ['wisehire-jds', userId] });
      toast.success('Role archived.');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive role');
    },
  });

  return { ...query, updateRole, createRole, deleteRole };
}
