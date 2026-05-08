import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await databases.listDocuments(DATABASE_ID, 'notifications', [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt')
      ]);
      return response.documents.map(doc => ({
        id: doc.$id,
        user_id: doc.user_id,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        is_read: !!doc.is_read,
        created_at: doc.$createdAt
      }));
    },
    enabled: !!user,
  });
}

export function useNotificationMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await databases.updateDocument(DATABASE_ID, 'notifications', id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const response = await databases.listDocuments(DATABASE_ID, 'notifications', [
        Query.equal('user_id', user.id)
      ]);
      await Promise.all(response.documents.map(doc => databases.deleteDocument(DATABASE_ID, 'notifications', doc.$id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    },
  });

  return { markAsRead, clearAll };
}
