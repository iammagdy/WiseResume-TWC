import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
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

function docToComment(doc: Record<string, unknown>): ShareComment {
  return {
    id: doc.$id as string,
    author_name: doc.author_name as string,
    section: (doc.section as string | null) ?? null,
    content: doc.content as string,
    is_resolved: Boolean(doc.is_resolved),
    created_at: doc.$createdAt as string,
  };
}

/** Fetch comments for a share (owner, by share_id) */
export function useShareComments(shareId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['share-comments', shareId],
    queryFn: async () => {
      if (!shareId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.share_comments, [
        Query.equal('share_id', shareId),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      return res.documents.map(d => docToComment(d as unknown as Record<string, unknown>));
    },
    enabled: !!user && !!shareId,
  });
}

/** Fetch comments for a public share page (by token) */
export function usePublicShareComments(token: string | null) {
  return useQuery({
    queryKey: ['public-share-comments', token],
    queryFn: async () => {
      if (!token) return [];
      // Resolve the share document ID from the token.
      // Query.select('$id') — only the document ID is needed; no sensitive
      // fields (password, user_id, etc.) should be returned in this public call.
      const shareRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resume_shares, [
        Query.equal('token', token),
        Query.select(['$id']),
        Query.limit(1),
      ]);
      if (shareRes.documents.length === 0) return [];
      const shareId = shareRes.documents[0].$id;

      const commentsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.share_comments, [
        Query.equal('share_id', shareId),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);
      return commentsRes.documents.map(d => docToComment(d as unknown as Record<string, unknown>));
    },
    enabled: !!token,
  });
}

/** Add a comment (public, no auth required — token is the access credential) */
export function useAddShareComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      shareToken: string;
      authorName: string;
      content: string;
      section?: string;
    }) => {
      // Resolve share_id from token — select only $id; no sensitive fields exposed.
      const shareRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resume_shares, [
        Query.equal('token', input.shareToken),
        Query.select(['$id']),
        Query.limit(1),
      ]);
      if (shareRes.documents.length === 0) throw new Error('Share not found');
      const shareId = shareRes.documents[0].$id;

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.share_comments,
        ID.unique(),
        {
          share_id: shareId,
          author_name: input.authorName,
          content: input.content,
          section: input.section ?? null,
          is_resolved: false,
        },
      );
      return docToComment(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['public-share-comments', variables.shareToken],
      });
      toast.success('Feedback submitted!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit feedback');
    },
  });
}

/** Resolve a comment (owner only) */
export function useResolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, resolved }: { commentId: string; resolved: boolean }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.share_comments, commentId, {
        is_resolved: resolved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-comments'] });
    },
  });
}
