import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ResumeShare {
  id: string;
  resume_id: string;
  is_active: boolean;
  has_password: boolean;
  expires_at: string | null;
  view_count: number;
  created_at: string | null;
}

export interface CreatedResumeShare extends ResumeShare {
  /** One-time bearer credential returned only when a link is created/rotated. */
  token: string;
}

export interface PublicShareResult {
  access_token: string;
  share: {
    is_active: true;
    expires_at: string | null;
    view_count: number;
  };
  resume: Record<string, unknown>;
}

export interface PasswordRequiredResult {
  requires_password: true;
  authenticated: false;
  password_incorrect?: boolean;
}

export type PublicResumeResult = PublicShareResult | PasswordRequiredResult;

function resultOrThrow<T>(
  result: { data: T | null; error: { message: string } | null },
  fallback: string,
): T {
  if (result.error || result.data === null) {
    throw new Error(result.error?.message || fallback);
  }
  return result.data;
}

/**
 * Owner-only share list. Share documents are server-only; the browser never
 * queries the collection or receives password/token hashes.
 */
export function useResumeShares(resumeId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['resume-shares', resumeId, user?.id],
    queryFn: async () => resultOrThrow(
      await appwriteFunctions.invoke<ResumeShare[]>('list-resume-shares', {
        body: { resumeId },
      }),
      'Could not load share links.',
    ),
    enabled: !!user && !!resumeId,
  });
}

/**
 * Loads public content through the server-authoritative share gate. The server
 * validates token strength/hash, revocation, expiry, and password state before
 * it reads any resume content.
 */
export function usePublicResume(token: string | null) {
  return useQuery({
    queryKey: ['public-resume', token],
    queryFn: async (): Promise<PublicResumeResult> => {
      if (!token) throw new Error('No share token.');
      return resultOrThrow(
        await appwriteFunctions.invoke<PublicResumeResult>('get-resume-share', {
          body: { token },
        }),
        'Share link not found or expired.',
      );
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
    gcTime: 0,
  });
}

/** Password submission uses a mutation so plaintext never becomes a query key. */
export function useUnlockPublicResume() {
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ token, password }: { token: string; password: string }) => resultOrThrow(
      await appwriteFunctions.invoke<PublicResumeResult>('get-resume-share', {
        body: { token, password },
      }),
      'Could not unlock this share.',
    ),
  });
}

export function useResumeShareMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createShare = useMutation({
    gcTime: 0,
    mutationFn: async (input: {
      resumeId: string;
      password?: string;
      expires_at?: string;
    }): Promise<CreatedResumeShare> => {
      if (!user) throw new Error('Not authenticated');
      return resultOrThrow(
        await appwriteFunctions.invoke<CreatedResumeShare>('create-resume-share', {
          body: input,
        }),
        'Failed to create share link.',
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
      toast.success('Share link created!');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create share link'),
  });

  const updateShare = useMutation({
    gcTime: 0,
    mutationFn: async ({ id, ...updates }: Partial<ResumeShare> & {
      id: string;
      password?: string | null;
      rotate_token?: boolean;
    }): Promise<ResumeShare | CreatedResumeShare> => {
      if (!user) throw new Error('Not authenticated');
      return resultOrThrow(
        await appwriteFunctions.invoke<ResumeShare | CreatedResumeShare>('update-resume-share', {
          body: { id, updates },
        }),
        'Failed to update share link.',
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resume_id] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update share'),
  });

  const deleteShare = useMutation({
    gcTime: 0,
    mutationFn: async ({ id, resumeId }: { id: string; resumeId: string }) => {
      if (!user) throw new Error('Not authenticated');
      resultOrThrow(
        await appwriteFunctions.invoke<{ deleted: true }>('delete-resume-share', {
          body: { id },
        }),
        'Failed to remove share link.',
      );
      return { resumeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume-shares', data.resumeId] });
      toast.success('Share link removed');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete share'),
  });

  return { createShare, updateShare, deleteShare };
}
