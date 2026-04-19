import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import type { MaskResult } from './useMaskCVs';

export interface MaskSession {
  id: string;
  owner_id: string;
  created_at: string;
  results: MaskResult[];
}

export function useMaskSessions() {
  return useQuery({
    queryKey: ['mask-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wisehire_mask_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        results: row.results as MaskResult[],
      })) as MaskSession[];
    },
  });
}

export function useInvalidateMaskSessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['mask-sessions'] });
}
