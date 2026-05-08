import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResumeShare {
  id: string;
  resume_id: string;
  user_id: string;
  token: string;
  is_active: boolean;
  password: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function docToShare(doc: Record<string, unknown>): ResumeShare {
  return {
    id: doc.$id as string,
    resume_id: doc.resume_id as string,
    user_id: doc.user_id as string,
    token: doc.token as string,
    is_active: Boolean(doc.is_active),
    password: (doc.password as string | null) ?? null,
    expires_at: (doc.expires_at as string | null) ?? null,
    view_count: Number(doc.view_count ?? 0),
    created_at: doc.$createdAt as string,
  };
}

export function useResumeShares(resumeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resume-shares', resumeId, user?.id],
    queryFn: async () => {
      if (!user || !resumeId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resume_shares, [
        Query.equal('user_id', user.id),
        Query.equal('resume_id', resumeId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      return res.documents.map(d => docToShare(d as unknown as Record<string, unknown>));
    },
    enabled: !!user && !!resumeId,
  });
}

export interface PublicShareResult {
  share: {
    resume_id: string;
    is_active: boolean;
    expires_at: string | null;
    view_count: number;
  };
  resume: Record<string, unknown>;
}

export interface PasswordRequiredResult {
  requires_password: true;
  authenticated: false;
}

export type PublicResumeResult = PublicShareResult | PasswordRequiredResult;

/**
 * Subset of share fields safe to load for unauthenticated public lookups.
 * The `password` field is intentionally excluded — validation is always
 * delegated to the server-side `verify-share-password` Appwrite Function so
 * password material is never exposed to the client.
 */
interface PublicShareDoc {
  $id: string;
  resume_id: string;
  user_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  $createdAt: string;
  /** True when a password is set on the share (server-computed or stored bool). */
  has_password?: boolean;
}

function docToPublicShare(doc: Record<string, unknown>): PublicShareDoc {
  return {
    $id: doc.$id as string,
    resume_id: doc.resume_id as string,
    user_id: doc.user_id as string,
    token: doc.token as string,
    is_active: Boolean(doc.is_active),
    expires_at: (doc.expires_at as string | null) ?? null,
    view_count: Number(doc.view_count ?? 0),
    $createdAt: doc.$createdAt as string,
    has_password: Boolean(doc.has_password),
  };
}

/**
 * Public resume lookup by share token.
 *
 * Password validation is ALWAYS server-side via the `verify-share-password`
 * Appwrite Function. The stored password value is never compared on the
 * client — doing so would expose password material to unauthenticated callers
 * through the network response. The client only receives `has_password: bool`
 * (or infers it from the presence of the password field) and delegates the
 * actual comparison to the Function.
 */
export function usePublicResume(token: string | null, passwordAttempt?: string) {
  return useQuery({
    queryKey: ['public-resume', token, passwordAttempt],
    queryFn: async (): Promise<PublicResumeResult> => {
      if (!token) throw new Error('No token');

      const shareRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resume_shares, [
        Query.equal('token', token),
        Query.select(['$id', '$createdAt', 'resume_id', 'user_id', 'token',
                      'is_active', 'expires_at', 'view_count', 'has_password']),
        Query.limit(1),
      ]);
      if (shareRes.documents.length === 0) throw new Error('Share link not found or expired');

      const shareDoc = shareRes.documents[0] as unknown as Record<string, unknown>;
      const share = docToPublicShare(shareDoc);

      if (!share.is_active) throw new Error('Share link not found or expired');
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        throw new Error('Share link not found or expired');
      }

      // Password gate — validation is server-side only.
      // The stored password value is never read or compared on the client.
      if (share.has_password) {
        if (!passwordAttempt) {
          return { requires_password: true, authenticated: false };
        }
        // Delegate comparison to the server-side Appwrite Function.
        const { data, error } = await edgeFunctions.invoke<{ authenticated: boolean }>(
          'verify-share-password',
          { body: { token, password: passwordAttempt } },
        );
        if (error || !data?.authenticated) {
          return { requires_password: true, authenticated: false };
        }
      }

      // Load the resume
      const resumeDoc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.resumes,
        share.resume_id,
      ) as unknown as Record<string, unknown>;

      // Increment view count fire-and-forget
      databases.updateDocument(DATABASE_ID, COLLECTIONS.resume_shares, share.$id, {
        view_count: share.view_count + 1,
      }).catch(() => {});

      return {
        share: {
          resume_id: share.resume_id,
          is_active: share.is_active,
          expires_at: share.expires_at,
          view_count: share.view_count,
        },
        resume: resumeDoc,
      };
    },
    enabled: !!token,
  });
}

export function useResumeShareMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createShare = useMutation({
    mutationFn: async (input: {
      resumeId: string;
      password?: string;
      expires_at?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const token = generateToken();
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.resume_shares,
        ID.unique(),
        {
          user_id: user.id,
          resume_id: input.resumeId,
          token,
          is_active: true,
          password: input.password ?? null,
          has_password: !!input.password,
          expires_at: input.expires_at ?? null,
          view_count: 0,
        },
      );
      return docToShare(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
      toast.success('Share link created!');
    },
    onError: () => toast.error('Failed to create share link'),
  });

  const updateShare = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResumeShare> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: Record<string, unknown> = {};
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
      if (updates.password !== undefined) {
        payload.password = updates.password;
        payload.has_password = !!updates.password;
      }
      if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at;
      const doc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.resume_shares,
        id,
        payload,
      );
      return docToShare(doc as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
    },
    onError: () => toast.error('Failed to update share'),
  });

  const deleteShare = useMutation({
    mutationFn: async ({ id, resumeId }: { id: string; resumeId: string }) => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.resume_shares, id);
      return { resumeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resumeId] });
      toast.success('Share link removed');
    },
    onError: () => toast.error('Failed to delete share'),
  });

  /**
   * View-count increment is now handled inside usePublicResume (optimistic +
   * fire-and-forget updateDocument). This mutation is kept for external callers
   * that may trigger it independently (e.g., analytics pipelines).
   */
  const incrementViewCount = useMutation({
    mutationFn: async (token: string) => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resume_shares, [
        Query.equal('token', token),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) return;
      const doc = res.documents[0] as unknown as Record<string, unknown>;
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.resume_shares, doc.$id as string, {
        view_count: Number(doc.view_count ?? 0) + 1,
      });
    },
  });

  return { createShare, updateShare, deleteShare, incrementViewCount };
}
