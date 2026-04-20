import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { notifications } = await apiFetch<{ notifications: Notification[] }>('/api/data/notifications');
      return notifications;
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      const { count } = await apiFetch<{ count: number }>('/api/data/notifications/unread-count');
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useNotificationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch('/api/data/notifications/mark-read', {
        method: 'POST',
        body: { id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch('/api/data/notifications/mark-all-read', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => toast.error('Failed to update notifications'),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch(`/api/data/notifications/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Failed to delete notification'),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      await apiFetch('/api/data/notifications', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    },
    onError: () => toast.error('Failed to clear notifications'),
  });

  return { markAsRead, markAllAsRead, deleteNotification, clearAll };
}
