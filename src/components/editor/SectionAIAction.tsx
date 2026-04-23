import { memo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import { toast } from 'sonner';
import type { Experience, Education, ContactInfo, ResumeData } from '@/types/resume';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useSummaryAIBridge } from '@/store/summaryAIBridge';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
}

/**
 * String- and single-object-shaped sections route through the preview
 * dialog so the user can review (and discard) the AI output before it
 * overwrites the resume. Array-shaped sections (experience, skills,
 * education, etc.) keep the existing direct-apply + merge-by-id
 * behavior — building a proper diff/preview UI for those structured
 * lists is tracked separately and out of scope here.
 */
const PREVIEW_SECTIONS: ReadonlySet<SectionType> = new Set(['summary', 'contact']);

function isPreviewSection(section: SectionType): boolean {
  return PREVIEW_SECTIONS.has(section);
}

/** Render a contact info object as a stable, human-readable preview string. */
function contactToText(c?: Partial<ContactInfo> | null): string {
  if (!c || typeof c !== 'object') return '';
  const labels: Array<[keyof ContactInfo, string]> = [
    ['fullName', 'Name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['location', 'Location'],
    ['linkedin', 'LinkedIn'],
    ['github', 'GitHub'],
    ['portfolio', 'Portfolio'],
  ];
  return labels
    .map(([key, label]) => {
      const v = (c as Record<string, unknown>)[key as string];
      return typeof v === 'string' && v.trim() !== '' ? `${label}: ${v.trim()}` : null;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
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

  // For structured (non-string) preview sections like `contact`, the
  // dialog displays a formatted text rendering of the AI's object, but
  // the apply path needs the original structured object — keep the
  // latest snapshot here so Apply writes the real object, not the
  // serialized text.
  const contactSnapshotRef = useRef<Partial<ContactInfo> | null>(null);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section,
    onApply: (content) => {
      // Array-shaped sections only — string/object preview sections
      // route their apply through the dialog's onApply handler below.
      if (isPreviewSection(section)) return;
      const applyMap: Record<string, () => void> = {
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

    const enhanceResult = await enhance(
      actionId as ActionType,
      contentMap[section],
      currentResume,
      jobDescription || undefined,
    );

    if (!enhanceResult) return;

    // Preview sections: open the dialog whenever the enhance call
    // succeeded — even if `improved` came back empty (e.g. the
    // server-side sanitizer scrubbed everything away). The dialog
    // lets the user edit manually or hit Re-run instead of leaving
    // them with a no-op click and no recovery path.
    if (isPreviewSection(section)) {
      if (section === 'contact' && enhanceResult.improved && typeof enhanceResult.improved === 'object' && !Array.isArray(enhanceResult.improved)) {
        contactSnapshotRef.current = enhanceResult.improved as Partial<ContactInfo>;
      }
      setShowDialog(true);
      return;
    }

    if (!enhanceResult.improved) return;

    // Array-shaped sections: keep the existing direct-apply behavior
    // with merge-by-id safety so partial responses don't wipe
    // unmentioned entries.
    const applyMap: Record<string, () => void> = {
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

  // Register the trigger in the shared bridge so other summary entry
  // points (empty-state CTA, contextual nudge, intake auto-gen) flow
  // through this single instance instead of mounting their own dialog.
  // Keep a ref to the latest handler so we don't re-register on every
  // render (which would recreate the trigger reference and cause
  // consumers to thrash).
  const setBridgeTrigger = useSummaryAIBridge(state => state.setTrigger);
  const handleActionRef = useRef(handleAction);
  handleActionRef.current = handleAction;
  useEffect(() => {
    if (section !== 'summary') return;
    const trigger = (action: ActionType) => { void handleActionRef.current(action); };
    setBridgeTrigger(trigger);
    return () => {
      // Only clear if we're still the registered owner. (Defensive
      // against StrictMode double-invoke or a future second instance.)
      const current = useSummaryAIBridge.getState().trigger;
      if (current === trigger) setBridgeTrigger(null);
    };
  }, [section, setBridgeTrigger]);

  const handleRerun = async (action: 'shorten' | 'improve' | 'generate', currentText: string) => {
    if (!currentResume) return;
    // For contact, currentText is the formatted preview string and is
    // not a meaningful re-run input. Send the live contact object
    // instead so the model has real fields to work with, and refresh
    // the snapshot from whatever comes back.
    if (section === 'contact') {
      const r = await enhance(action as ActionType, currentResume.contactInfo, currentResume, jobDescription || undefined);
      if (r?.improved && typeof r.improved === 'object' && !Array.isArray(r.improved)) {
        contactSnapshotRef.current = r.improved as Partial<ContactInfo>;
      }
      return;
    }
    await enhance(action as ActionType, currentText, currentResume, jobDescription || undefined);
  };

  const handleApplyFromDialog = (editedText: string) => {
    if (section === 'summary') {
      if (typeof editedText !== 'string' || editedText.trim() === '') return;
      updateResume({ summary: editedText });
      // Match SummarySection's apply behavior — rescore against the
      // freshly mutated resume so the ATS score badge reflects the
      // change without waiting for the next background pass.
      if (currentResume) {
        const next: ResumeData = { ...currentResume, summary: editedText };
        void rescoreAfterApply(next);
      }
    } else if (section === 'contact') {
      // Contact edits in the dialog are display-only (the field
      // structure can't be safely round-tripped from free-form text).
      // Apply the AI-returned object snapshot.
      const snapshot = contactSnapshotRef.current;
      if (snapshot && typeof snapshot === 'object') {
        updateResume({ contactInfo: { ...currentResume?.contactInfo, ...snapshot } as ContactInfo });
      }
      contactSnapshotRef.current = null;
    }
    // Clear the AI result and close the dialog. apply() also fires the
    // "Changes applied!" toast via useAIEnhance's internal handler.
    apply(editedText);
    setShowDialog(false);
  };

  const handleDiscardFromDialog = () => {
    contactSnapshotRef.current = null;
    discard();
    setShowDialog(false);
  };

  let previewOriginal = '';
  let previewImproved = '';
  if (section === 'summary') {
    previewOriginal = currentResume?.summary ?? '';
    previewImproved = typeof result?.improved === 'string' ? result.improved : '';
  } else if (section === 'contact') {
    previewOriginal = contactToText(currentResume?.contactInfo);
    previewImproved = result?.improved && typeof result.improved === 'object' && !Array.isArray(result.improved)
      ? contactToText(result.improved as Partial<ContactInfo>)
      : '';
  }

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
          improved={previewImproved}
          changes={result?.changes || []}
          suggestions={result?.suggestions}
          isEnhancing={isEnhancing}
          onRerun={handleRerun}
          onApply={handleApplyFromDialog}
          onDiscard={handleDiscardFromDialog}
          title={section === 'summary' ? 'Enhanced Summary' : section === 'contact' ? 'Contact Updates' : 'AI Enhancement'}
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
