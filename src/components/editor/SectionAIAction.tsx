import { memo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import type { Experience, Education, ContactInfo, ResumeData } from '@/types/resume';
import { AIEnhanceDialog } from './ai/AIEnhanceDialog';
import { useSummaryAIBridge } from '@/store/summaryAIBridge';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
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

function getString(o: unknown, k: string): string {
  if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
    const v = (o as Record<string, unknown>)[k];
    return typeof v === 'string' ? v : '';
  }
  return '';
}

function getStringArray(o: unknown, k: string): string[] {
  if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
    const v = (o as Record<string, unknown>)[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

/**
 * Format an arbitrary array/object AI suggestion as readable text for the
 * preview dialog. Mirrors the `contactToText` pattern: the preview is
 * display-only — Approve writes the original structured payload, not this
 * formatted string.
 */
function formatSuggestionForPreview(section: SectionType, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  if (section === 'skills' || section === 'languages') {
    if (Array.isArray(value)) {
      return value
        .map(v => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object') {
            const name = getString(v, 'name') || getString(v, 'language');
            const prof = getString(v, 'proficiency') || getString(v, 'level');
            return prof ? `${name} (${prof})` : name;
          }
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }
    return String(value);
  }

  const formatItem = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    switch (section) {
      case 'experience': {
        const head = [getString(item, 'position'), getString(item, 'company')].filter(Boolean).join(' — ');
        const desc = getString(item, 'description');
        const ach = getStringArray(item, 'achievements');
        const parts = [head, desc, ...ach.map(a => `• ${a}`)].filter(Boolean);
        return parts.join('\n');
      }
      case 'education': {
        const deg = [getString(item, 'degree'), getString(item, 'field')].filter(Boolean).join(' in ');
        const inst = getString(item, 'institution');
        const head = [deg, inst].filter(Boolean).join(' — ');
        const desc = getString(item, 'description');
        return [head, desc].filter(Boolean).join('\n');
      }
      case 'projects': {
        const head = [getString(item, 'name'), getString(item, 'role')].filter(Boolean).join(' — ');
        const desc = getString(item, 'description');
        const techs = getStringArray(item, 'technologies');
        const techLine = techs.length > 0 ? `Technologies: ${techs.join(', ')}` : '';
        return [head, desc, techLine].filter(Boolean).join('\n');
      }
      case 'awards': {
        const head = [getString(item, 'title'), getString(item, 'issuer')].filter(Boolean).join(' — ');
        const desc = getString(item, 'description');
        return [head, desc].filter(Boolean).join('\n');
      }
      case 'publications': {
        const head = [getString(item, 'title'), getString(item, 'publisher')].filter(Boolean).join(' — ');
        const desc = getString(item, 'description');
        return [head, desc].filter(Boolean).join('\n');
      }
      case 'volunteering': {
        const head = [getString(item, 'role'), getString(item, 'organization')].filter(Boolean).join(' @ ');
        const desc = getString(item, 'description');
        return [head, desc].filter(Boolean).join('\n');
      }
      case 'certifications': {
        const head = [getString(item, 'name'), getString(item, 'issuer')].filter(Boolean).join(' — ');
        const date = getString(item, 'date');
        return [head, date].filter(Boolean).join('\n');
      }
      default:
        try {
          return JSON.stringify(item);
        } catch {
          return '';
        }
    }
  };

  if (Array.isArray(value)) {
    return value.map(formatItem).filter(Boolean).join('\n\n');
  }
  return formatItem(value);
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

  // Cache the latest structured AI payload. The dialog displays a
  // formatted text rendering of this for non-string sections, but the
  // Approve path needs the original object/array so we can merge it
  // safely back into the resume — the formatted string is display-only.
  const latestPayloadRef = useRef<unknown>(null);

  const { enhance, isEnhancing, result, apply, discard } = useAIEnhance({
    section,
    // All sections route through the preview popup now — the dialog's
    // onApply handler does the actual merge into the store, so the hook's
    // onApply is a no-op here.
    onApply: () => {},
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

    // Stash the original structured payload so Approve can write the
    // real object/array back into the store. The dialog only sees the
    // formatted preview text.
    latestPayloadRef.current = enhanceResult.improved;
    setShowDialog(true);
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
    // For non-string sections, currentText is the formatted preview and
    // is not a meaningful re-run input. Send the live section data so
    // the model has the real fields to work with.
    if (section === 'summary') {
      await enhance(action as ActionType, currentText, currentResume, jobDescription || undefined);
      return;
    }
    const liveContent: Record<SectionType, unknown> = {
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
    const r = await enhance(action as ActionType, liveContent[section], currentResume, jobDescription || undefined);
    if (r?.improved !== undefined) {
      latestPayloadRef.current = r.improved;
    }
  };

  /**
   * Apply the AI suggestion to the resume. The dialog passes the user's
   * edited text — for `summary` we use that text directly. For all other
   * sections the structured payload from `latestPayloadRef` is the
   * authoritative content (the formatted preview text isn't a safe
   * round-trip back to the section's data shape).
   */
  const handleApplyFromDialog = (editedText: string) => {
    if (!currentResume) {
      setShowDialog(false);
      return;
    }

    if (section === 'summary') {
      if (typeof editedText !== 'string' || editedText.trim() === '') {
        setShowDialog(false);
        return;
      }
      updateResume({ summary: editedText });
      const next: ResumeData = { ...currentResume, summary: editedText };
      void rescoreAfterApply(next);
      apply(editedText);
      setShowDialog(false);
      latestPayloadRef.current = null;
      return;
    }

    const payload = latestPayloadRef.current;

    if (section === 'contact') {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        updateResume({
          contactInfo: { ...currentResume.contactInfo, ...(payload as Partial<ContactInfo>) } as ContactInfo,
        });
      }
      apply(editedText);
      setShowDialog(false);
      latestPayloadRef.current = null;
      return;
    }

    // Array-shaped sections — merge by id where possible.
    const applyMap: Record<string, () => void> = {
      experience: () => {
        if (Array.isArray(payload)) {
          updateResume({ experience: mergeByIdOrReplace<Experience>(currentResume.experience ?? [], payload as Experience[]) });
        } else if (payload && typeof payload === 'object' && 'id' in payload && typeof (payload as { id: unknown }).id === 'string') {
          updateResume({ experience: mergeObjectById<Experience>(currentResume.experience ?? [], payload as Experience) });
        }
      },
      education: () => {
        if (Array.isArray(payload)) {
          updateResume({ education: mergeByIdOrReplace<Education>(currentResume.education ?? [], payload as Education[]) });
        } else if (payload && typeof payload === 'object' && 'id' in payload && typeof (payload as { id: unknown }).id === 'string') {
          updateResume({ education: mergeObjectById<Education>(currentResume.education ?? [], payload as Education) });
        }
      },
      skills: () => { if (Array.isArray(payload)) updateResume({ skills: payload as string[] }); },
      awards: () => { if (Array.isArray(payload)) updateResume({ awards: payload as ResumeData['awards'] }); },
      projects: () => { if (Array.isArray(payload)) updateResume({ projects: payload as ResumeData['projects'] }); },
      publications: () => { if (Array.isArray(payload)) updateResume({ publications: payload as ResumeData['publications'] }); },
      volunteering: () => { if (Array.isArray(payload)) updateResume({ volunteering: payload as ResumeData['volunteering'] }); },
      certifications: () => { if (Array.isArray(payload)) updateResume({ certifications: payload as ResumeData['certifications'] }); },
      languages: () => { if (Array.isArray(payload)) updateResume({ languages: payload as ResumeData['languages'] }); },
    };
    if (Object.prototype.hasOwnProperty.call(applyMap, section)) applyMap[section]();
    apply(editedText);
    setShowDialog(false);
    latestPayloadRef.current = null;
  };

  const handleDiscardFromDialog = () => {
    latestPayloadRef.current = null;
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
  } else {
    const liveOriginal: Record<SectionType, unknown> = {
      contact: currentResume?.contactInfo,
      summary: currentResume?.summary,
      experience: currentResume?.experience,
      education: currentResume?.education,
      skills: currentResume?.skills,
      awards: currentResume?.awards || [],
      projects: currentResume?.projects || [],
      publications: currentResume?.publications || [],
      volunteering: currentResume?.volunteering || [],
      certifications: currentResume?.certifications || [],
      languages: currentResume?.languages || [],
    };
    previewOriginal = formatSuggestionForPreview(section, liveOriginal[section]);
    previewImproved = formatSuggestionForPreview(section, result?.improved);
  }

  const dialogTitle = (() => {
    switch (section) {
      case 'summary': return 'Enhanced Summary';
      case 'contact': return 'Contact Updates';
      case 'experience': return 'Enhanced Experience';
      case 'education': return 'Enhanced Education';
      case 'skills': return 'Enhanced Skills';
      case 'awards': return 'Enhanced Awards';
      case 'projects': return 'Enhanced Projects';
      case 'publications': return 'Enhanced Publications';
      case 'volunteering': return 'Enhanced Volunteering';
      case 'certifications': return 'Enhanced Certifications';
      case 'languages': return 'Enhanced Languages';
      default: return 'AI Enhancement';
    }
  })();

  return (
    <>
      <InlineAIButton
        section={section}
        onAction={handleAction}
        isLoading={isEnhancing}
        isAuthenticated={isAuthenticated}
        onLockedClick={() => setShowSignIn(true)}
      />

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
        title={dialogTitle}
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
