import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { dbToResumeData, getResumeDocumentUpdatedAt } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { logAudit } from '@/lib/auditLogger';
import type { AppUser } from '@/contexts/AuthContext';
import { migrateTemplateId as migrateLegacyTemplateId } from '@/lib/templateMigration';

interface DatabaseResumeLike {
  id: string;
  user_id: string;
  updated_at?: string | null;
  template_id?: string | null;
  title: string;
  parent_resume_id?: string | null;
}

interface UseEditorHydrationOptions {
  resumeFromDb: DatabaseResumeLike | null | undefined;
  currentResumeId: string | null;
  user: AppUser | null;
  setCurrentResumeId: (id: string | null) => void;
  navigate: ReturnType<typeof useNavigate>;
  lastSavedResumeRef: React.MutableRefObject<string>;
  isSavingRef: React.MutableRefObject<boolean>;
}

/**
 * Handles initial DB→Zustand hydration, ownership check, and stale-resume
 * detection on subsequent React Query refetches.
 *
 * Returns `localLoadedAtRef` — the timestamp the session first loaded the
 * resume, used by useEditorAutosave for conflict detection.
 */
export function useEditorHydration({
  resumeFromDb,
  currentResumeId,
  user,
  setCurrentResumeId,
  navigate,
  lastSavedResumeRef,
  isSavingRef,
}: UseEditorHydrationOptions): {
  localLoadedAtRef: React.MutableRefObject<string | null>;
  lastRefreshedServerTs: React.MutableRefObject<string | null>;
} {
  const localLoadedAtRef = useRef<string | null>(null);
  const lastRefreshedServerTs = useRef<string | null>(null);

  // Single hydration effect: sync DB data into Zustand store + ownership check.
  // Also detects stale resume: if server version is newer than local, auto-refresh.
  useEffect(() => {
    if (!resumeFromDb || !currentResumeId) return;

    // Ownership check
    if (user && resumeFromDb.user_id !== user.id) {
      setCurrentResumeId(null);
      toast.error('Access denied.');
      navigate('/dashboard', { replace: true });
      return;
    }

    const localResume = useResumeStore.getState().currentResume;
    const dbResume = dbToResumeData(resumeFromDb as any);
    const dbTemplateId =
      (resumeFromDb as { template_id?: string | null; template?: string | null }).template_id
      ?? (resumeFromDb as { template?: string | null }).template
      ?? dbResume.templateId
      ?? 'modern';

    // Initial hydration: store empty OR persisted resume is for a different id
    // (common when opening /editor?id=… after another resume was cached locally).
    if (!localResume || localResume.id !== currentResumeId) {
      useResumeStore.getState().setCurrentResume(dbResume);
      useResumeStore.getState().setSelectedTemplate(migrateLegacyTemplateId(dbTemplateId));
      localLoadedAtRef.current = getResumeDocumentUpdatedAt(resumeFromDb) ?? null;
      lastSavedResumeRef.current = JSON.stringify(dbResume);
      logAudit('account', 'editor_session_started', {
        resumeId: currentResumeId,
        resumeTitle: resumeFromDb.title,
      });
      return;
    }

    // Stale-resume detection on subsequent React Query refetches
    const serverUpdatedAt = getResumeDocumentUpdatedAt(resumeFromDb);
    const localLoadedAt = localLoadedAtRef.current;
    if (
      !isSavingRef.current &&
      serverUpdatedAt &&
      localLoadedAt &&
      Date.parse(serverUpdatedAt) > Date.parse(localLoadedAt) &&
      serverUpdatedAt !== lastRefreshedServerTs.current
    ) {
      const isClean = lastSavedResumeRef.current === JSON.stringify(localResume);

      if (isClean) {
        useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb as any));
        useResumeStore.getState().setSelectedTemplate(
          migrateLegacyTemplateId((resumeFromDb.template_id as string) || 'modern')
        );
        localLoadedAtRef.current = serverUpdatedAt;
        lastSavedResumeRef.current = JSON.stringify(dbToResumeData(resumeFromDb as any));
        lastRefreshedServerTs.current = serverUpdatedAt;
        toast.info('Resume updated — refreshed to latest version.', { duration: 3000 });
      } else {
        // Prevent silent overwrite of dirty state
        toast.error(
          'Resume updated from another device. Please save or refresh to sync.',
          { duration: 5000, action: { label: 'Refresh', onClick: () => window.location.reload() } }
        );
      }
    }
  }, [resumeFromDb, currentResumeId, user, setCurrentResumeId, navigate, lastSavedResumeRef, isSavingRef]);

  return { localLoadedAtRef, lastRefreshedServerTs };
}
