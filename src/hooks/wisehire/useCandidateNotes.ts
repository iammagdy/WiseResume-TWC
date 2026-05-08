import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Models } from 'appwrite';

export type NoteTag = 'general' | 'highlight' | 'concern';

export interface CandidateNote {
  id: string;
  candidate_id: string;
  owner_id: string;
  author_id: string;
  body: string;
  tag: NoteTag;
  pinned: boolean;
  created_at: string;
}

function docToNote(doc: Models.Document): CandidateNote {
  return { ...doc, id: doc.$id } as unknown as CandidateNote;
}

export function useCandidateNotes(candidateId: string | undefined) {
  const { isAuthenticated, user } = useAuth();
  return useQuery({
    queryKey: ['candidate-notes', user?.id, candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_candidate_notes, [
        Query.equal('candidate_id', candidateId),
        Query.orderDesc('pinned'),
        Query.orderDesc('created_at'),
      ]);
      return res.documents.map(docToNote);
    },
    enabled: isAuthenticated && !!candidateId,
    staleTime: 30_000,
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      candidateId,
      body,
      tag = 'general',
    }: {
      candidateId: string;
      body: string;
      tag?: NoteTag;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error('Not authenticated');

      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.wisehire_candidate_notes,
        ID.unique(),
        {
          owner_id: userId,
          candidate_id: candidateId,
          author_id: userId,
          body: body.trim(),
          tag,
          pinned: false,
        },
      );
      return { ...docToNote(doc), userId };
    },
    onSuccess: ({ userId }, vars) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', userId, vars.candidateId] });
    },
    onError: () => toast.error('Failed to add note'),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ noteId, candidateId }: { noteId: string; candidateId: string }) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.wisehire_candidate_notes, noteId);
      return { candidateId, userId: user?.id };
    },
    onSuccess: ({ candidateId, userId }) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', userId, candidateId] });
    },
    onError: () => toast.error('Failed to delete note'),
  });
}

export function useTogglePinNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      noteId,
      candidateId,
      pinned,
    }: {
      noteId: string;
      candidateId: string;
      pinned: boolean;
    }) => {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_candidate_notes, noteId, {
        pinned: !pinned,
      });
      return { candidateId, userId: user?.id };
    },
    onSuccess: ({ candidateId, userId }) => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', userId, candidateId] });
    },
  });
}
