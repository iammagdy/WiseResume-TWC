import { memo, useState, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
}

export const SectionAIAction = memo(function SectionAIAction({ section }: SectionAIActionProps) {
  const currentResume = useResumeStore(state => state.currentResume);
  const updateResume = useResumeStore(state => state.updateResume);
  const jobDescription = useResumeStore(state => state.jobDescription);
  const { isAuthenticated } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  const { enhance, isEnhancing } = useAIEnhance({
    section,
    onApply: (content) => {
      const applyMap: Record<string, () => void> = {
        contact: () => { if (content && typeof content === 'object') updateResume({ contactInfo: content as any }); },
        summary: () => { if (typeof content === 'string') updateResume({ summary: content }); },
        experience: () => { if (Array.isArray(content)) updateResume({ experience: content }); },
        education: () => { if (Array.isArray(content)) updateResume({ education: content }); },
        skills: () => { if (Array.isArray(content)) updateResume({ skills: content }); },
        awards: () => { if (Array.isArray(content)) updateResume({ awards: content }); },
        projects: () => { if (Array.isArray(content)) updateResume({ projects: content }); },
        publications: () => { if (Array.isArray(content)) updateResume({ publications: content }); },
        volunteering: () => { if (Array.isArray(content)) updateResume({ volunteering: content }); },
        certifications: () => { if (Array.isArray(content)) updateResume({ certifications: content }); },
        languages: () => { if (Array.isArray(content)) updateResume({ languages: content }); },
      };
      applyMap[section]?.();
      toast.success('AI suggestion applied!');
    },
  });

  const handleAction = async (actionId: string) => {
    if (!currentResume) return;

    const contentMap: Record<SectionType, unknown> = {
      contact: currentResume.contactInfo,
      summary: currentResume.summary,
      experience: currentResume.experience,
      education: currentResume.education,
      skills: currentResume.skills,
      awards: currentResume.awards || [],
      projects: currentResume.projects || [],
      publications: currentResume.publications || [],
      volunteering: currentResume.volunteering || [],
      certifications: currentResume.certifications || [],
      languages: currentResume.languages || [],
    };

    const result = await enhance(
      actionId as ActionType,
      contentMap[section],
      currentResume,
      jobDescription || undefined,
    );

    if (result?.improved) {
      const applyMap: Record<string, () => void> = {
        contact: () => { if (result.improved && typeof result.improved === 'object') updateResume({ contactInfo: result.improved as any }); },
        summary: () => { if (typeof result.improved === 'string') updateResume({ summary: result.improved }); },
        experience: () => { if (Array.isArray(result.improved)) updateResume({ experience: result.improved }); },
        education: () => { if (Array.isArray(result.improved)) updateResume({ education: result.improved }); },
        skills: () => { if (Array.isArray(result.improved)) updateResume({ skills: result.improved }); },
        awards: () => { if (Array.isArray(result.improved)) updateResume({ awards: result.improved }); },
        projects: () => { if (Array.isArray(result.improved)) updateResume({ projects: result.improved }); },
        publications: () => { if (Array.isArray(result.improved)) updateResume({ publications: result.improved }); },
        volunteering: () => { if (Array.isArray(result.improved)) updateResume({ volunteering: result.improved }); },
        certifications: () => { if (Array.isArray(result.improved)) updateResume({ certifications: result.improved }); },
        languages: () => { if (Array.isArray(result.improved)) updateResume({ languages: result.improved }); },
      };
      applyMap[section]?.();
      toast.success('AI suggestion applied!');
    }
  };

  return (
    <>
      <InlineAIButton
        section={section}
        onAction={handleAction}
        isLoading={isEnhancing}
        isAuthenticated={isAuthenticated}
        onLockedClick={() => setShowSignIn(true)}
      />
      {showSignIn && (
        <Suspense fallback={null}>
          <SignInPromptDialog
            open={showSignIn}
            onOpenChange={setShowSignIn}
            title="Unlock AI Assist"
            description="Sign in to access AI-powered resume editing."
          />
        </Suspense>
      )}
    </>
  );
});
