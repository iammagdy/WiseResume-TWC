import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import type { Session } from '@supabase/supabase-js';
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

export function useGuestMigration(session: Session | null) {
  const [isMigrating, setIsMigrating] = useState(false);
  const hasRun = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasRun.current) return;
    if (!session?.user) return;
    if (isMigrationDone(PIPELINE_ID)) return;

    const guest = readGuestResume();
    if (!guest) return;

    hasRun.current = true;
    setIsMigrating(true);

    const { resume, resumeId } = guest;

    const toJson = (v: unknown) => JSON.parse(JSON.stringify(v ?? {}));
    const toJsonArr = (v: unknown) => JSON.parse(JSON.stringify(v ?? []));

    const steps: MigrationStep[] = [
      {
        name: 'check-existing',
        action: async () => {
          const { exists } = await apiFetch<{ exists: boolean }>(
            `/api/data/resumes/exists/${encodeURIComponent(resumeId)}`,
          );
          if (exists) return 'skip-remaining';
        },
      },
      {
        name: 'insert-resume',
        action: async () => {
          // Re-check existence for idempotency (in case checkpoint write failed)
          const { exists } = await apiFetch<{ exists: boolean }>(
            `/api/data/resumes/exists/${encodeURIComponent(resumeId)}`,
          );
          if (exists) return;

          await apiFetch('/api/data/resumes', {
            method: 'POST',
            body: {
              title: resume.contactInfo?.fullName
                ? `${resume.contactInfo.fullName}'s Resume`
                : 'My Resume',
              contact_info: toJson(resume.contactInfo),
              summary: resume.summary || '',
              experience: toJsonArr(resume.experience),
              education: toJsonArr(resume.education),
              skills: toJsonArr(resume.skills),
              certifications: toJsonArr(resume.certifications),
              awards: toJsonArr(resume.awards),
              projects: toJsonArr(resume.projects),
              publications: toJsonArr(resume.publications),
              volunteering: toJsonArr(resume.volunteering),
              hobbies: toJsonArr(resume.hobbies),
              references: toJsonArr(resume.references),
              template_id: resume.templateId || 'modern',
              customization: toJson(resume.customization),
            },
          });
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
  }, [session, queryClient]);

  return { isMigrating };
}
