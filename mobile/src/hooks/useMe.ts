import { useQuery } from '@tanstack/react-query';
import { callEdgeFunction } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

export interface MeResponse {
  id: string;
  email: string;
  name?: string;
  plan: 'free' | 'pro' | 'premium' | 'trial';
  credits: { used: number; limit: number };
  features?: Record<string, boolean>;
}

export function useMe() {
  const userId = useAuthStore((s) => s.identity?.userId);
  return useQuery({
    queryKey: ['me', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => callEdgeFunction<MeResponse>('me', { method: 'GET' }),
  });
}
