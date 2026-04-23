import { memo, useState, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import { toast } from 'sonner';
import type { Experience, Education, ContactInfo, ResumeData } from '@/types/resume';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
}

/**
 * String-shaped sections route through the preview dialog so the user
 * can review (and edit) the AI output before it overwrites the resume.
 * Array/object-shaped sections (experience, skills, education, etc.)
 * keep the existing direct-apply + merge-by-id behavior — building a
 * proper diff/preview UI for those structured sections is tracked
 * separately and out of scope here.
 */
const PREVIEW_SECTIONS: ReadonlySet<SectionType> = new Set(['summary']);

function isPreviewSection(section: SectionType): boolean {
  return PREVIEW_SECTIONS.has(section);
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
  const [showDialog, setShowDialog] = useState(false);
  const { rescoreAfterApply } = useAIApplyEffects(currentResume?.id);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section,
    onApply: (content) => {
      // Array/object-shaped sections only — string sections route their
      // apply through the preview dialog branch below.
      const applyMap: Record<string, () => void> = {
        contact: () => { if (content && typeof content === 'object') updateResume({ contactInfo: { ...currentResume?.contactInfo, ...(content as Partial<ContactInfo>) } }); },
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
      // For string sections the dialog supplies its own toast on Apply
      // (via useAIEnhance.apply) — only toast here for the direct-apply
      // (array) branch.
      if (!isPreviewSection(section)) toast.success('AI suggestion applied!');
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

    const enhanceResult = await enhance(
      actionId as ActionType,
      contentMap[section],
      currentResume,
      jobDescription || undefined,
    );

    if (!enhanceResult) return;

    // String sections (summary): open the preview dialog whenever the
    // enhance call succeeded — even if `improved` came back empty (e.g.
    // the server-side sanitizer scrubbed everything away). The dialog
    // lets the user edit manually or hit Re-run instead of leaving them
    // with a no-op click and no recovery path.
    if (isPreviewSection(section)) {
      setShowDialog(true);
      return;
    }

    if (!enhanceResult.improved) return;

    // Array/object-shaped sections: keep the existing direct-apply
    // behavior with merge-by-id safety so partial responses don't wipe
    // unmentioned entries.
    const applyMap: Record<string, () => void> = {
      contact: () => { if (enhanceResult.improved && typeof enhanceResult.improved === 'object') updateResume({ contactInfo: { ...currentResume?.contactInfo, ...(enhanceResult.improved as Partial<ContactInfo>) } }); },
      experience: () => {
        if (Array.isArray(enhanceResult.improved)) {
          updateResume({ experience: mergeByIdOrReplace<Experience>(currentResume?.experience ?? [], enhanceResult.improved as Experience[]) });
        } else if (enhanceResult.improved && typeof enhanceResult.improved === 'object' && 'id' in enhanceResult.improved && typeof (enhanceResult.improved as { id: unknown }).id === 'string') {
          updateResume({ experience: mergeObjectById<Experience>(currentResume?.experience ?? [], enhanceResult.improved as Experience) });
        }
      },
      education: () => {
        if (Array.isArray(enhanceResult.improved)) {
          updateResume({ education: mergeByIdOrReplace<Education>(currentResume?.education ?? [], enhanceResult.improved as Education[]) });
        } else if (enhanceResult.improved && typeof enhanceResult.improved === 'object' && 'id' in enhanceResult.improved && typeof (enhanceResult.improved as { id: unknown }).id === 'string') {
          updateResume({ education: mergeObjectById<Education>(currentResume?.education ?? [], enhanceResult.improved as Education) });
        }
      },
      skills: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ skills: enhanceResult.improved }); },
      awards: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ awards: enhanceResult.improved }); },
      projects: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ projects: enhanceResult.improved }); },
      publications: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ publications: enhanceResult.improved }); },
      volunteering: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ volunteering: enhanceResult.improved }); },
      certifications: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ certifications: enhanceResult.improved }); },
      languages: () => { if (Array.isArray(enhanceResult.improved)) updateResume({ languages: enhanceResult.improved }); },
    };
    if (Object.prototype.hasOwnProperty.call(applyMap, section)) applyMap[section]();
    toast.success('AI suggestion applied!');
  };

  const handleRerun = async (action: 'shorten' | 'improve' | 'generate', currentText: string) => {
    if (!currentResume) return;
    await enhance(action as ActionType, currentText, currentResume, jobDescription || undefined);
  };

  const handleApplyFromDialog = (editedText: string) => {
    if (typeof editedText !== 'string' || editedText.trim() === '') return;
    if (section === 'summary') {
      updateResume({ summary: editedText });
      // Match SummarySection's apply behavior — rescore against the
      // freshly mutated resume so the ATS score badge reflects the
      // change without waiting for the next background pass.
      if (currentResume) {
        const next: ResumeData = { ...currentResume, summary: editedText };
        void rescoreAfterApply(next);
      }
    }
    // Clear the AI result and close the dialog. apply() also fires the
    // "Changes applied!" toast.
    apply(editedText);
    setShowDialog(false);
  };

  const handleDiscardFromDialog = () => {
    discard();
    setShowDialog(false);
  };

  const previewOriginal = section === 'summary' ? (currentResume?.summary ?? '') : '';

  return (
    <>
      <InlineAIButton
        section={section}
        onAction={handleAction}
        isLoading={isEnhancing}
        isAuthenticated={isAuthenticated}
        onLockedClick={() => setShowSignIn(true)}
      />

      {isPreviewSection(section) && (
        <AIEnhanceDialog
          isOpen={showDialog}
          original={previewOriginal}
          improved={typeof result?.improved === 'string' ? result.improved : ''}
          changes={result?.changes || []}
          suggestions={result?.suggestions}
          isEnhancing={isEnhancing}
          onRerun={handleRerun}
          onApply={handleApplyFromDialog}
          onDiscard={handleDiscardFromDialog}
          title={section === 'summary' ? 'Enhanced Summary' : 'AI Enhancement'}
        />
      )}

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
