import { memo } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { toast } from 'sonner';

interface SectionAIActionProps {
  section: SectionType;
}

export const SectionAIAction = memo(function SectionAIAction({ section }: SectionAIActionProps) {
  const currentResume = useResumeStore(state => state.currentResume);
  const updateResume = useResumeStore(state => state.updateResume);
  const jobDescription = useResumeStore(state => state.jobDescription);

  const { enhance, isEnhancing } = useAIEnhance({
    section,
    onApply: (content) => {
      switch (section) {
        case 'contact':
          if (content && typeof content === 'object') {
            updateResume({ contactInfo: content as any });
          }
          break;
        case 'summary':
          if (typeof content === 'string') {
            updateResume({ summary: content });
          }
          break;
        case 'experience':
          if (Array.isArray(content)) {
            updateResume({ experience: content });
          }
          break;
        case 'education':
          if (Array.isArray(content)) {
            updateResume({ education: content });
          }
          break;
        case 'skills':
          if (Array.isArray(content)) {
            updateResume({ skills: content });
          }
          break;
      }
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
    };

    const result = await enhance(
      actionId as ActionType,
      contentMap[section],
      currentResume,
      jobDescription || undefined,
    );

    // Auto-apply if result returned
    if (result?.improved) {
      switch (section) {
        case 'contact':
          if (result.improved && typeof result.improved === 'object') {
            updateResume({ contactInfo: result.improved as any });
          }
          break;
        case 'summary':
          if (typeof result.improved === 'string') {
            updateResume({ summary: result.improved });
          }
          break;
        case 'experience':
          if (Array.isArray(result.improved)) {
            updateResume({ experience: result.improved });
          }
          break;
        case 'education':
          if (Array.isArray(result.improved)) {
            updateResume({ education: result.improved });
          }
          break;
        case 'skills':
          if (Array.isArray(result.improved)) {
            updateResume({ skills: result.improved });
          }
          break;
      }
      toast.success('AI suggestion applied!');
    }
  };

  return (
    <InlineAIButton
      section={section}
      onAction={handleAction}
      isLoading={isEnhancing}
    />
  );
});
