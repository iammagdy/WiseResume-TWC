import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
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
  const { isAuthenticated, supabaseReady } = useAuth();
  const userId = getUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wisehire-clients', userId],
    queryFn: async (): Promise<WiseHireClient[]> => {
      const { data, error } = await supabase
        .from('wisehire_clients')
        .select('id, name, contact_name, contact_email, notes, created_at, updated_at')
        .eq('owner_id', userId)
        .eq('is_deleted', false)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WiseHireClient[];
    },
    enabled: isAuthenticated && supabaseReady && !!userId,
    staleTime: 60_000,
  });

  const createClient = useMutation({
    mutationFn: async (input: { name: string; contact_name?: string; contact_email?: string; notes?: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('wisehire_clients')
        .insert({ owner_id: userId, ...input })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client added.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to add client'),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WiseHireClient> & { id: string }) => {
      const { error } = await supabase
        .from('wisehire_clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client updated.');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to update client'),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wisehire_clients')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('owner_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wisehire-clients', userId] });
      toast.success('Client removed.');
    },
    onError: () => toast.error('Failed to remove client'),
  });

  return { ...query, createClient, updateClient, deleteClient };
}
