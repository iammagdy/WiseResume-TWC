import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ShareComment {
  id: string;
  author_name: string;
  section: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
}

function resultOrThrow<T>(
  result: { data: T | null; error: { message: string } | null },
  fallback: string,
): T {
  if (result.error || result.data === null) throw new Error(result.error?.message || fallback);
  return result.data;
}

/** Fetch all comments for the authenticated share owner. */
export function useShareComments(shareId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['share-comments', shareId, user?.id],
    queryFn: async () => resultOrThrow(
      await appwriteFunctions.invoke<ShareComment[]>('list-share-comments', {
        body: { shareId },
      }),
      'Could not load feedback.',
    ),
    enabled: !!user && !!shareId,
  });
}

/**
 * Public feedback is available only after the content gate issued an access
 * capability. Protected-share comments therefore cannot bypass the password.
 */
export function usePublicShareComments(token: string | null, accessToken: string | null) {
  return useQuery({
    queryKey: ['public-share-comments', token],
    queryFn: async () => {
      if (!token || !accessToken) return [];
      return resultOrThrow(
        await appwriteFunctions.invoke<ShareComment[]>('get-public-share-comments', {
          body: { token, accessToken },
        }),
        'Could not load feedback.',
      );
    },
    enabled: !!token && !!accessToken,
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
}

export function useAddShareComment() {
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (input: {
      shareToken: string;
      accessToken: string;
      authorName: string;
      content: string;
      section?: string;
    }) => resultOrThrow(
      await appwriteFunctions.invoke<ShareComment>('add-public-share-comment', {
        body: {
          token: input.shareToken,
          accessToken: input.accessToken,
          authorName: input.authorName,
          content: input.content,
          section: input.section,
        },
      }),
      'Failed to submit feedback.',
    ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-share-comments', variables.shareToken] });
      toast.success('Feedback submitted!');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to submit feedback'),
  });
}

export function useResolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ commentId, resolved }: { commentId: string; resolved: boolean }) => resultOrThrow(
      await appwriteFunctions.invoke<ShareComment>('resolve-share-comment', {
        body: { commentId, resolved },
      }),
      'Failed to update feedback.',
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-comments'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update feedback'),
  });
}
