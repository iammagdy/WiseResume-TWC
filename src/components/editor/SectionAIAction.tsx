import { memo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { InlineAIButton, SectionType } from './InlineAIButton';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useAIApplyEffects } from '@/hooks/useAIApplyEffects';
import type { Experience, Education, ContactInfo, ResumeData } from '@/types/resume';
import { AIEnhanceDialog, type EntryDiff, type FieldDiff, type ListLineDiff, type FieldDiffStatus } from './ai/AIEnhanceDialog';
import { useSectionAIBridge } from '@/store/sectionAIBridge';

const SignInPromptDialog = lazy(() => import('@/components/auth/SignInPromptDialog').then(m => ({ default: m.SignInPromptDialog })));

interface SectionAIActionProps {
  section: SectionType;
  /** Called after the user clicks Apply and the section data is written to the store. */
  onApplied?: () => void;
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

// ===== Entry-diff builders =====
//
// Produce a structured per-entry diff for array-shaped sections so the
// preview popup can render each entry as its own block with field-level
// highlights instead of a flat block of text.

type FieldSpec = {
  key: string;
  label: string;
  /** Treat the value as a string array (e.g. achievements). */
  isList?: boolean;
};

const SECTION_FIELDS: Record<string, FieldSpec[]> = {
  experience: [
    { key: 'position', label: 'Position' },
    { key: 'company', label: 'Company' },
    { key: 'account', label: 'Account' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: 'description', label: 'Description' },
    { key: 'achievements', label: 'Achievements', isList: true },
    { key: 'responsibilities', label: 'Responsibilities', isList: true },
  ],
  education: [
    { key: 'degree', label: 'Degree' },
    { key: 'field', label: 'Field' },
    { key: 'institution', label: 'Institution' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: 'gpa', label: 'GPA' },
    { key: 'description', label: 'Description' },
  ],
  projects: [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: 'technologies', label: 'Technologies', isList: true },
    { key: 'description', label: 'Description' },
    { key: 'url', label: 'URL' },
    { key: 'githubUrl', label: 'GitHub' },
  ],
  awards: [
    { key: 'title', label: 'Title' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
  ],
  publications: [
    { key: 'title', label: 'Title' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'date', label: 'Date' },
    { key: 'coAuthors', label: 'Co-authors' },
    { key: 'url', label: 'URL' },
    { key: 'description', label: 'Description' },
  ],
  volunteering: [
    { key: 'role', label: 'Role' },
    { key: 'organization', label: 'Organization' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: 'hours', label: 'Hours' },
    { key: 'description', label: 'Description' },
  ],
  certifications: [
    { key: 'name', label: 'Name' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'date', label: 'Date' },
    { key: 'expiryDate', label: 'Expires' },
    { key: 'credentialId', label: 'Credential ID' },
  ],
};

function entryTitle(section: SectionType, item: Record<string, unknown> | null | undefined): string {
  if (!item) return '';
  const s = (k: string) => getString(item, k);
  switch (section) {
    case 'experience': return [s('position'), s('company')].filter(Boolean).join(' @ ') || '(Untitled experience)';
    case 'education': {
      const left = [s('degree'), s('field')].filter(Boolean).join(' in ');
      return [left, s('institution')].filter(Boolean).join(' — ') || '(Untitled education)';
    }
    case 'projects': return [s('name'), s('role')].filter(Boolean).join(' — ') || '(Untitled project)';
    case 'awards': return [s('title'), s('issuer')].filter(Boolean).join(' — ') || '(Untitled award)';
    case 'publications': return [s('title'), s('publisher')].filter(Boolean).join(' — ') || '(Untitled publication)';
    case 'volunteering': return [s('role'), s('organization')].filter(Boolean).join(' @ ') || '(Untitled volunteering)';
    case 'certifications': return [s('name'), s('issuer')].filter(Boolean).join(' — ') || '(Untitled certification)';
    case 'languages': {
      const name = s('name') || s('language');
      const prof = s('proficiency') || s('level');
      return prof ? `${name} (${prof})` : (name || '(Untitled language)');
    }
    default: return '';
  }
}

function listLineDiffs(before: string[], after: string[]): ListLineDiff[] {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const out: ListLineDiff[] = [];
  before.forEach(t => {
    out.push({ text: t, status: afterSet.has(t) ? 'unchanged' : 'removed' });
  });
  after.forEach(t => {
    if (!beforeSet.has(t)) out.push({ text: t, status: 'added' });
  });
  return out;
}

function scalarStatus(before: string, after: string): FieldDiffStatus {
  const a = (before ?? '').trim();
  const b = (after ?? '').trim();
  if (a === b) return 'unchanged';
  if (!a && b) return 'added';
  if (a && !b) return 'removed';
  return 'changed';
}

function buildEntryFields(
  spec: FieldSpec[],
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldDiff[] {
  return spec.map(({ key, label, isList }) => {
    if (isList) {
      const a = before ? getStringArray(before, key) : [];
      const b = after ? getStringArray(after, key) : [];
      const lines = listLineDiffs(a, b);
      const anyChange = lines.some(l => l.status !== 'unchanged');
      const onlyAdded = lines.every(l => l.status === 'added' || l.status === 'unchanged') && lines.some(l => l.status === 'added');
      const onlyRemoved = lines.every(l => l.status === 'removed' || l.status === 'unchanged') && lines.some(l => l.status === 'removed');
      const status: FieldDiffStatus = !anyChange
        ? 'unchanged'
        : onlyAdded
        ? 'added'
        : onlyRemoved
        ? 'removed'
        : 'changed';
      return { key, label, status, isList: true, lines };
    }
    const a = before ? getString(before, key) : '';
    const b = after ? getString(after, key) : '';
    return { key, label, status: scalarStatus(a, b), before: a, after: b };
  }).filter(f => {
    // Drop fields that are unchanged AND empty on both sides — they add no info.
    if (f.status !== 'unchanged') return true;
    if (f.isList) return (f.lines?.length ?? 0) > 0;
    return Boolean((f.before ?? '') || (f.after ?? ''));
  });
}

/**
 * Build per-entry diffs for an array-shaped section. Returns null when
 * the section isn't an array-of-objects shape we can render this way
 * (skills/languages handled separately; summary/contact bypass entirely).
 */
function buildEntryDiffs(
  section: SectionType,
  originalValue: unknown,
  improvedValue: unknown,
): EntryDiff[] | null {
  // Skills: flat string array. Apply does a full replace — any skill the
  // AI dropped will actually be removed from the resume, so reflect that
  // honestly here.
  if (section === 'skills') {
    const before = Array.isArray(originalValue) ? (originalValue as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    let after: string[] | null = null;
    if (Array.isArray(improvedValue)) {
      after = (improvedValue as unknown[]).filter((x): x is string => typeof x === 'string');
    }
    if (after === null) return null;
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    const seen = new Set<string>();
    const entries: EntryDiff[] = [];
    before.forEach(s => {
      if (seen.has(s)) return;
      seen.add(s);
      entries.push({
        id: `skill:${s}`,
        title: s,
        status: afterSet.has(s) ? 'unchanged' : 'removed',
        fields: [],
      });
    });
    after.forEach(s => {
      if (seen.has(s)) return;
      seen.add(s);
      entries.push({
        id: `skill:${s}`,
        title: s,
        status: beforeSet.has(s) ? 'unchanged' : 'new',
        fields: [],
      });
    });
    return entries;
  }

  // Languages: array of {id?, name, proficiency}. Apply does a full
  // replace, so omitted languages are actually removed — show that.
  if (section === 'languages') {
    if (!Array.isArray(improvedValue)) return null;
    const beforeArr = (Array.isArray(originalValue) ? originalValue : []) as Record<string, unknown>[];
    const afterArr = improvedValue as Record<string, unknown>[];
    const keyOf = (item: Record<string, unknown>) =>
      (getString(item, 'name') || getString(item, 'language')).toLowerCase();
    const afterMap = new Map<string, Record<string, unknown>>();
    afterArr.forEach(it => { const k = keyOf(it); if (k) afterMap.set(k, it); });
    const beforeKeys = new Set<string>();
    beforeArr.forEach(it => { const k = keyOf(it); if (k) beforeKeys.add(k); });
    const entries: EntryDiff[] = [];
    const seen = new Set<string>();
    beforeArr.forEach(it => {
      const k = keyOf(it);
      if (!k || seen.has(k)) return;
      seen.add(k);
      const a = afterMap.get(k) ?? null;
      if (!a) {
        entries.push({
          id: `lang:${k}`,
          title: entryTitle('languages', it),
          status: 'removed',
          fields: [],
        });
        return;
      }
      const before = getString(it, 'proficiency') || getString(it, 'level');
      const after = getString(a, 'proficiency') || getString(a, 'level');
      const changed = before !== after;
      entries.push({
        id: `lang:${k}`,
        title: entryTitle('languages', a),
        status: changed ? 'changed' : 'unchanged',
        fields: changed ? [{ key: 'proficiency', label: 'Proficiency', status: scalarStatus(before, after), before, after }] : [],
      });
    });
    afterArr.forEach(it => {
      const k = keyOf(it);
      if (!k || seen.has(k)) return;
      seen.add(k);
      entries.push({
        id: `lang:${k}`,
        title: entryTitle('languages', it),
        status: beforeKeys.has(k) ? 'unchanged' : 'new',
        fields: [],
      });
    });
    return entries;
  }

  const spec = SECTION_FIELDS[section];
  if (!spec) return null;

  // Normalise the improved payload to an array of objects, and remember
  // whether the AI returned a single object vs a real array — that
  // determines which apply path runs (mergeObjectById vs
  // mergeByIdOrReplace vs full replace) and therefore how the diff
  // should be presented.
  let improvedArr: Record<string, unknown>[] | null = null;
  let isSingleObject = false;
  if (Array.isArray(improvedValue)) {
    improvedArr = (improvedValue as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x));
  } else if (improvedValue && typeof improvedValue === 'object' && !Array.isArray(improvedValue)) {
    improvedArr = [improvedValue as Record<string, unknown>];
    isSingleObject = true;
  }
  if (!improvedArr || improvedArr.length === 0) return null;

  const originalArr = (Array.isArray(originalValue) ? originalValue : []) as Record<string, unknown>[];

  // Mirror the apply-time behaviour exactly:
  //   - awards/projects/publications/volunteering/certifications: the
  //     entire array is replaced with the AI payload, regardless of ids.
  //     Anything the AI omitted is REMOVED from the resume.
  //   - experience/education:
  //       * single object payload + id → mergeObjectById (touches one entry).
  //       * single object payload without id → apply is a no-op.
  //       * array payload with ids on every item → mergeByIdOrReplace
  //         keeps omitted originals untouched.
  //       * array payload with any item missing an id → mergeByIdOrReplace
  //         falls back to a full replace, so omitted originals are removed.
  const REPLACE_SECTIONS = new Set<SectionType>([
    'awards', 'projects', 'publications', 'volunteering', 'certifications',
  ]);
  const everyHasId = improvedArr.every(it => !!getString(it, 'id'));
  let strategy: 'merge' | 'replace' | 'noop';
  if (REPLACE_SECTIONS.has(section)) {
    strategy = 'replace';
  } else if (isSingleObject) {
    strategy = getString(improvedArr[0], 'id') ? 'merge' : 'noop';
  } else {
    strategy = everyHasId ? 'merge' : 'replace';
  }

  // No-op apply path (single object without id in merge-only section):
  // there's nothing meaningful to preview as a diff. Fall back to the
  // text view so the user at least sees the raw AI suggestion.
  if (strategy === 'noop') return null;

  const willMergeById = strategy === 'merge';

  const originalMap = new Map<string, Record<string, unknown>>();
  originalArr.forEach(it => {
    const id = getString(it, 'id');
    if (id) originalMap.set(id, it);
  });
  const improvedIds = new Set<string>();
  improvedArr.forEach(it => { const id = getString(it, 'id'); if (id) improvedIds.add(id); });

  const entries: EntryDiff[] = [];
  const seen = new Set<string>();

  // Walk original first so the diff list mirrors the resume's existing order.
  originalArr.forEach((orig, idx) => {
    const oid = getString(orig, 'id');
    const key = oid || `orig:${idx}`;
    if (seen.has(key)) return;
    seen.add(key);
    const ai = oid ? (improvedIds.has(oid) ? improvedArr!.find(a => getString(a, 'id') === oid) ?? null : null) : null;

    if (ai) {
      const fields = buildEntryFields(spec, orig, ai);
      const anyChanged = fields.some(f => f.status !== 'unchanged');
      entries.push({
        id: key,
        title: entryTitle(section, ai) || entryTitle(section, orig),
        status: anyChanged ? 'changed' : 'unchanged',
        fields,
      });
      return;
    }

    // No AI counterpart for this original entry.
    if (willMergeById) {
      // Apply preserves it. Show as unchanged, no fields.
      entries.push({
        id: key,
        title: entryTitle(section, orig),
        status: 'unchanged',
        fields: [],
      });
    } else {
      // Apply will replace the whole array, dropping this entry.
      entries.push({
        id: key,
        title: entryTitle(section, orig),
        status: 'removed',
        fields: [],
      });
    }
  });

  // Then any AI items the original didn't have — these will be inserted.
  improvedArr.forEach((ai, idx) => {
    const aid = getString(ai, 'id');
    const key = aid || `new:${idx}`;
    if (seen.has(key)) return;
    if (aid && originalMap.has(aid)) return;
    seen.add(key);
    entries.push({
      id: key,
      title: entryTitle(section, ai),
      status: 'new',
      fields: buildEntryFields(spec, null, ai),
    });
  });

  return entries;
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

export const SectionAIAction = memo(function SectionAIAction({ section, onApplied }: SectionAIActionProps) {
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

  // Register the trigger in the shared bridge so other entry points
  // for this section (empty-state CTAs, contextual nudges, intake
  // auto-gen) flow through this single instance instead of mounting
  // their own dialog or — worse — writing the AI payload directly to
  // the resume without a preview. Keep a ref to the latest handler so
  // we don't re-register on every render (which would recreate the
  // trigger reference and cause consumers to thrash).
  const setBridgeTrigger = useSectionAIBridge(state => state.setTrigger);
  const handleActionRef = useRef(handleAction);
  handleActionRef.current = handleAction;
  useEffect(() => {
    const trigger = (action: ActionType) => { void handleActionRef.current(action); };
    setBridgeTrigger(section, trigger);
    return () => {
      // Only clear if we're still the registered owner. (Defensive
      // against StrictMode double-invoke or a future second instance.)
      const current = useSectionAIBridge.getState().triggers[section];
      if (current === trigger) setBridgeTrigger(section, null);
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
      onApplied?.();
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
      onApplied?.();
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
    onApplied?.();
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

  // Build a per-entry diff for array-shaped sections so the popup can show
  // each entry as its own block (changed fields highlighted, unchanged
  // entries collapsed) instead of one flat formatted string.
  const entryDiffs: EntryDiff[] | undefined = (() => {
    if (section === 'summary' || section === 'contact') return undefined;
    if (!result?.improved) return undefined;
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
    const built = buildEntryDiffs(section, liveOriginal[section], result.improved);
    return built && built.length > 0 ? built : undefined;
  })();

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
        entries={entryDiffs}
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
