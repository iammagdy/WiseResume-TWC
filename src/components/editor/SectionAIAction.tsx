import { memo, useState, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Experience, Education, ContactInfo } from '@/types/resume';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
}

/**
 * Merge an AI-returned array of entries onto the existing array by `id`.
 *
 * - For each AI item that matches an existing entry by id: spread the AI
 *   item over the existing entry so fields the AI omitted are preserved.
 * - Existing entries whose ids are NOT in the AI result are kept unchanged
 *   (prevents a partial AI response from wiping unmentioned items).
 * - AI items whose ids are not found in the existing array are appended
 *   as new entries.
 * - Falls back to direct replacement only when the AI items have no ids
 *   (e.g. plain-string arrays like skills).
 */
function mergeByIdOrReplace<T extends { id: string }>(existing: T[], aiResult: T[]): T[] {
  if (aiResult.length === 0) return existing;
  const hasIds = aiResult.every(item => typeof item.id === 'string' && item.id);
  if (!hasIds) return aiResult;

  const aiMap = new Map<string, T>(aiResult.map(item => [item.id, item]));

  const merged: T[] = existing.map(entry =>
    aiMap.has(entry.id) ? { ...entry, ...aiMap.get(entry.id)! } : entry,
  );

  aiResult.forEach(item => {
    if (!existing.some(e => e.id === item.id)) {
      merged.push(item);
    }
  });

  return merged;
}

/**
 * Merge a single AI-returned entry object onto the matching existing entry
 * by `id`, preserving all other entries and all fields the AI omitted.
 * If the AI item's id is not found, it is appended as a new entry.
 */
function mergeObjectById<T extends { id: string }>(existing: T[], aiItem: T): T[] {
  const found = existing.some(e => e.id === aiItem.id);
  if (found) {
    return existing.map(e => e.id === aiItem.id ? { ...e, ...aiItem } : e);
  }
  return [...existing, aiItem];
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
        contact: () => { if (content && typeof content === 'object') updateResume({ contactInfo: { ...currentResume?.contactInfo, ...(content as Partial<ContactInfo>) } }); },
        summary: () => { if (typeof content === 'string') updateResume({ summary: content }); },
        experience: () => {
          if (Array.isArray(content)) {
            updateResume({ experience: mergeByIdOrReplace<Experience>(currentResume?.experience ?? [], content as Experience[]) });
          } else if (content && typeof content === 'object' && 'id' in content && typeof (content as { id: unknown }).id === 'string') {
            updateResume({ experience: mergeObjectById<Experience>(currentResume?.experience ?? [], content as Experience) });
          }
        },
        education: () => {
          if (Array.isArray(content)) {
            updateResume({ education: mergeByIdOrReplace<Education>(currentResume?.education ?? [], content as Education[]) });
          } else if (content && typeof content === 'object' && 'id' in content && typeof (content as { id: unknown }).id === 'string') {
            updateResume({ education: mergeObjectById<Education>(currentResume?.education ?? [], content as Education) });
          }
        },
        skills: () => { if (Array.isArray(content)) updateResume({ skills: content }); },
        awards: () => { if (Array.isArray(content)) updateResume({ awards: content }); },
        projects: () => { if (Array.isArray(content)) updateResume({ projects: content }); },
        publications: () => { if (Array.isArray(content)) updateResume({ publications: content }); },
        volunteering: () => { if (Array.isArray(content)) updateResume({ volunteering: content }); },
        certifications: () => { if (Array.isArray(content)) updateResume({ certifications: content }); },
        languages: () => { if (Array.isArray(content)) updateResume({ languages: content }); },
      };
      if (Object.prototype.hasOwnProperty.call(applyMap, section)) applyMap[section]();
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
        contact: () => { if (result.improved && typeof result.improved === 'object') updateResume({ contactInfo: { ...currentResume?.contactInfo, ...(result.improved as Partial<ContactInfo>) } }); },
        summary: () => { if (typeof result.improved === 'string') updateResume({ summary: result.improved }); },
        experience: () => {
          if (Array.isArray(result.improved)) {
            updateResume({ experience: mergeByIdOrReplace<Experience>(currentResume?.experience ?? [], result.improved as Experience[]) });
          } else if (result.improved && typeof result.improved === 'object' && 'id' in result.improved && typeof (result.improved as { id: unknown }).id === 'string') {
            updateResume({ experience: mergeObjectById<Experience>(currentResume?.experience ?? [], result.improved as Experience) });
          }
        },
        education: () => {
          if (Array.isArray(result.improved)) {
            updateResume({ education: mergeByIdOrReplace<Education>(currentResume?.education ?? [], result.improved as Education[]) });
          } else if (result.improved && typeof result.improved === 'object' && 'id' in result.improved && typeof (result.improved as { id: unknown }).id === 'string') {
            updateResume({ education: mergeObjectById<Education>(currentResume?.education ?? [], result.improved as Education) });
          }
        },
        skills: () => { if (Array.isArray(result.improved)) updateResume({ skills: result.improved }); },
        awards: () => { if (Array.isArray(result.improved)) updateResume({ awards: result.improved }); },
        projects: () => { if (Array.isArray(result.improved)) updateResume({ projects: result.improved }); },
        publications: () => { if (Array.isArray(result.improved)) updateResume({ publications: result.improved }); },
        volunteering: () => { if (Array.isArray(result.improved)) updateResume({ volunteering: result.improved }); },
        certifications: () => { if (Array.isArray(result.improved)) updateResume({ certifications: result.improved }); },
        languages: () => { if (Array.isArray(result.improved)) updateResume({ languages: result.improved }); },
      };
      if (Object.prototype.hasOwnProperty.call(applyMap, section)) applyMap[section]();
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
