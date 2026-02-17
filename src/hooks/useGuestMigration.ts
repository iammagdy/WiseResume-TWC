import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';
import type { Session } from '@supabase/supabase-js';

const MIGRATION_FLAG = 'wr-guest-migrated';

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
    // Basic check: must have some content
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

    // Prevent re-running in the same browser session
    if (sessionStorage.getItem(MIGRATION_FLAG)) return;

    const guest = readGuestResume();
    if (!guest) return;

    hasRun.current = true;
    setIsMigrating(true);

    const migrate = async () => {
      try {
        const { resume, resumeId } = guest;
        const userId = session.user.id;

        // Check if this resume ID already exists in the DB (unlikely but safe)
        const { data: existing } = await supabase
          .from('resumes')
          .select('id')
          .eq('id', resumeId)
          .maybeSingle();

        if (existing) {
          // Already migrated or ID collision – skip
          sessionStorage.setItem(MIGRATION_FLAG, '1');
          setIsMigrating(false);
          return;
        }

        // JSON.parse(JSON.stringify(...)) to satisfy Supabase Json type
        const toJson = (v: unknown) => JSON.parse(JSON.stringify(v ?? {}));
        const toJsonArr = (v: unknown) => JSON.parse(JSON.stringify(v ?? []));

        const { error } = await supabase.from('resumes').insert([{
          user_id: userId,
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
        }]);

        if (error) {
          console.error('Guest migration failed:', error);
          toast.error('Failed to migrate your draft resume. Your data is still saved locally.');
          setIsMigrating(false);
          return;
        }

        // Success – clear local data and refresh
        clearGuestResumeFromStore();
        sessionStorage.setItem(MIGRATION_FLAG, '1');
        await queryClient.invalidateQueries({ queryKey: ['resumes'] });
        toast.success('Your draft resume has been saved to your account.');
      } catch (err) {
        console.error('Guest migration error:', err);
        toast.error('Failed to migrate your draft resume. Your data is still saved locally.');
      } finally {
        setIsMigrating(false);
      }
    };

    migrate();
  }, [session, queryClient]);

  return { isMigrating };
}
