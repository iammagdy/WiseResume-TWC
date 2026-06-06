import type { QueryClient } from '@tanstack/react-query';

export function invalidateAiCreditQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'all' });
  void queryClient.invalidateQueries({ queryKey: ['ai-usage-breakdown'], refetchType: 'all' });
}
