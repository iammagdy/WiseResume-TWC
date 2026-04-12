import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { redactResumeForAI } from '@/lib/piiRedact';
import type { ResumeData } from '@/types/resume';

/**
 * Returns a redacted copy of the resume when "Redact personal info before AI processing"
 * is enabled in settings. Use this hook at any AI action call site before sending resume
 * data to an AI edge function.
 *
 * When redaction is off, returns the original resume reference unchanged.
 */
export function useRedactedResume(resume: ResumeData | null | undefined): ResumeData | null | undefined {
  const redactPiiBeforeAI = useSettingsStore(s => s.redactPiiBeforeAI);

  return useMemo(() => {
    if (!resume) return resume;
    return redactResumeForAI(resume, redactPiiBeforeAI);
  }, [resume, redactPiiBeforeAI]);
}
