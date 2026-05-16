import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  $id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  $createdAt: string;
  link?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.notifications, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt')
      ]);
      return response.documents;
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.notifications, [
        Query.equal('user_id', user.id),
        Query.equal('is_read', false)
      ]);
      return response.total;
    },
    enabled: !!user,
  });
}

export function useNotificationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.notifications, id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.notifications, [
        Query.equal('user_id', user.id),
        Query.equal('is_read', false),
      ]);
      await Promise.all(response.documents.map(doc =>
        databases.updateDocument(DATABASE_ID, COLLECTIONS.notifications, doc.$id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.notifications, [Query.equal('user_id', user.id)]);
      await Promise.all(response.documents.map(doc => databases.deleteDocument(DATABASE_ID, COLLECTIONS.notifications, doc.$id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('All notifications cleared');
    },
  });

  return { markAsRead, markAllAsRead, clearAll };
}
