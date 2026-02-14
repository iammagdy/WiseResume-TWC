import { useEffect, useRef, useCallback } from 'react';
import { useProofreadStore, selectActiveIssues } from '@/store/proofreadStore';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/settingsStore';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import type { ResumeData } from '@/types/resume';
import type { ProofreadIssue } from '@/types/proofread';
import { toast } from 'sonner';
import haptics from '@/lib/haptics';

function extractSections(resume: ResumeData) {
  const sections: { id: string; name: string; text: string }[] = [];

  if (resume.contactInfo?.fullName) {
    sections.push({ id: 'contact-name', name: 'Name', text: resume.contactInfo.fullName });
  }
  if (resume.summary) {
    sections.push({ id: 'summary', name: 'Summary', text: resume.summary });
  }
  resume.experience?.forEach((exp) => {
    const parts: string[] = [];
    if (exp.description) parts.push(exp.description);
    if (exp.achievements?.length) parts.push(exp.achievements.join('\n'));
    if (parts.length) {
      sections.push({
        id: `exp-${exp.id}`,
        name: `Experience - ${exp.company}`,
        text: parts.join('\n'),
      });
    }
  });
  resume.education?.forEach((edu) => {
    if (edu.degree || edu.field) {
      sections.push({
        id: `edu-${edu.id}`,
        name: `Education - ${edu.institution}`,
        text: [edu.degree, edu.field].filter(Boolean).join(' '),
      });
    }
  });

  return sections;
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function useProofread(resume: ResumeData | null) {
  const issues = useProofreadStore(s => s.issues);
  const score = useProofreadStore(s => s.score);
  const isChecking = useProofreadStore(s => s.isChecking);
  const setIssues = useProofreadStore(s => s.setIssues);
  const setScore = useProofreadStore(s => s.setScore);
  const setIsChecking = useProofreadStore(s => s.setIsChecking);
  const removeIssue = useProofreadStore(s => s.removeIssue);
  const ignoreIssue = useProofreadStore(s => s.ignoreIssue);
  const clear = useProofreadStore(s => s.clear);
  const activeIssues = useProofreadStore(useShallow(selectActiveIssues));
  const autoProofread = useSettingsStore((s) => s.autoProofread);
  const abortRef = useRef<AbortController | null>(null);
  const lastHashRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const runCheck = useCallback(
    async (resume: ResumeData) => {
      const sections = extractSections(resume);
      if (!sections.length) return;

      const textHash = hashText(JSON.stringify(sections));
      if (textHash === lastHashRef.current) return;

      // Cancel previous
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsChecking(true);
      try {
        const body: Record<string, unknown> = { sections };
        if (aiProvider === 'gemini' && geminiApiKey) {
          body.userGeminiKey = geminiApiKey;
        }

        const { data, error } = await supabase.functions.invoke('proofread-resume', {
          body,
        });

        if (controller.signal.aborted) return;

        if (error) {
          console.error('Proofread error:', error);
          return;
        }

        lastHashRef.current = textHash;
        setIssues(data.issues || []);
        setScore(data.score || null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Proofread failed:', e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsChecking(false);
        }
      }
    },
    [setIssues, setScore, setIsChecking, aiProvider, geminiApiKey]
  );

  // Debounced auto-check
  useEffect(() => {
    if (!resume || !autoProofread) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runCheck(resume), 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [resume, autoProofread, runCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clear();
    };
  }, [clear]);

  const checkNow = useCallback(() => {
    if (resume) runCheck(resume);
  }, [resume, runCheck]);

  const fixIssue = useCallback(
    (issueId: string, suggestionIndex = 0) => {
      const issue = issues.find((i) => i.id === issueId);
      if (!issue || !issue.suggestions[suggestionIndex]) return;

      const suggestion = issue.suggestions[suggestionIndex];
      const currentResume = useResumeStore.getState().currentResume;
      if (!currentResume) return;

      const updates: Partial<ResumeData> = {};

      if (issue.sectionId === 'summary' && currentResume.summary) {
        updates.summary = currentResume.summary.replace(issue.original, suggestion);
      } else if (issue.sectionId.startsWith('exp-')) {
        const expId = issue.sectionId.replace('exp-', '');
        updates.experience = currentResume.experience?.map((exp) => {
          if (exp.id !== expId) return exp;
          return {
            ...exp,
            description: exp.description?.replace(issue.original, suggestion) || exp.description,
            achievements: exp.achievements?.map((a) => a.replace(issue.original, suggestion)),
          };
        });
      }

      if (Object.keys(updates).length) {
        useResumeStore.getState().updateResume(updates);
        removeIssue(issueId);
        haptics.success();
        toast.success(`Fixed: "${issue.original}" → "${suggestion}"`, { duration: 2000 });
      }
    },
    [issues, removeIssue]
  );

  const fixAll = useCallback(() => {
    const spellingIssues = activeIssues.filter((i) => i.type === 'spelling' && i.suggestions.length > 0);
    spellingIssues.forEach((issue) => fixIssue(issue.id, 0));
    if (spellingIssues.length) {
      toast.success(`Fixed ${spellingIssues.length} spelling issue${spellingIssues.length > 1 ? 's' : ''}`, { duration: 2000 });
    }
  }, [activeIssues, fixIssue]);

  return {
    issues: activeIssues,
    score,
    isChecking,
    checkNow,
    fixIssue,
    ignoreIssue,
    fixAll,
  };
}
