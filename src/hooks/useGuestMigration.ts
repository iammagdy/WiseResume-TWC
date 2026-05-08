import { useState, useEffect, useRef } from 'react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { AppwriteException } from 'appwrite';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import { resumeDataToDb } from './useResumes';
import { runMigrationPipeline, isMigrationDone } from '@/lib/migrationRunner';
import type { MigrationStep } from '@/lib/migrationRunner';

const PIPELINE_ID = 'guest-resume';

interface GuestStoreState {
  state?: {
    currentResume?: ResumeData | null;
    currentResumeId?: string | null;
  };
}

function readGuestResume(): { resume: ResumeData; resumeId: string } | null {
  try {
    const raw = localStorage.getItem('resume-storage');
    if (!raw) return null;
    const parsed: GuestStoreState = JSON.parse(raw);
    const resume = parsed?.state?.currentResume;
    const resumeId = parsed?.state?.currentResumeId;
    if (!resume || !resumeId) return null;
    if (!resume.contactInfo && !resume.summary && (!resume.experience || resume.experience.length === 0)) {
      return null;
    }
    return { resume, resumeId };
  } catch {
    return null;
  }
}

function clearGuestResumeFromStore() {
  try {
    const raw = localStorage.getItem('resume-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.state) {
      parsed.state.currentResume = null;
      parsed.state.currentResumeId = null;
      localStorage.setItem('resume-storage', JSON.stringify(parsed));
    }
  } catch {
    // Ignore
  }
}

/**
 * Tries to get an Appwrite document by ID; returns true if it exists.
 * Re-throws any non-404 error so callers can surface real failures.
 */
async function resumeExists(resumeId: string): Promise<boolean> {
  try {
    await databases.getDocument(DATABASE_ID, COLLECTIONS.resumes, resumeId);
    return true;
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return false;
    throw err;
  }
}

export function useGuestMigration() {
  const { user } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const hasRun = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasRun.current) return;
    if (!user) return;
    if (isMigrationDone(PIPELINE_ID)) return;

    const guest = readGuestResume();
    if (!guest) return;

    hasRun.current = true;
    setIsMigrating(true);

    const { resume, resumeId } = guest;

    const steps: MigrationStep[] = [
      {
        name: 'check-existing',
        action: async () => {
          if (await resumeExists(resumeId)) return 'skip-remaining';
        },
      },
      {
        name: 'insert-resume',
        action: async () => {
          // Re-check for idempotency in case the checkpoint write previously failed.
          if (await resumeExists(resumeId)) return;

          const payload = {
            ...resumeDataToDb(resume, user.id),
            // Use the guest's full name for the title when available.
            title: resume.contactInfo?.fullName
              ? `${resume.contactInfo.fullName}'s Resume`
              : resume.title || 'My Resume',
          };

          // Using resumeId as the Appwrite document ID preserves idempotency:
          // a duplicate call would produce a 409 which resumeExists already guards.
          await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.resumes,
            resumeId,
            payload,
          );
        },
      },
      {
        name: 'cleanup-local',
        action: async () => {
          clearGuestResumeFromStore();
          await queryClient.invalidateQueries({ queryKey: ['resumes'] });
          toast.success('Your draft resume has been saved to your account.');
        },
      },
    ];

    const run = async () => {
      try {
        const result = await runMigrationPipeline(PIPELINE_ID, steps);
        if (!result.completed) {
          toast.info("We'll finish saving your draft next time you're online.");
        }
      } catch (err) {
        console.error('Guest migration error:', err);
        toast.error('Failed to migrate your draft resume. Your data is still saved locally.');
      } finally {
        setIsMigrating(false);
      }
    };

    run();
  }, [user, queryClient]);

  return { isMigrating };
}
