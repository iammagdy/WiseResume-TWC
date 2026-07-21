import { useMemo } from 'react';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import type { TailorHistory } from '@/types/resume';
import { useResumes } from '@/hooks/useResumes';
import { historyFromTailoredResumeOrFallback } from '@/lib/tailoringResumeMetadata';

export function useCombinedTailorHistory(limit = 20) {
  const { authReady } = useAuth();
  const localHistory = useResumeStore((s) => s.tailorHistory) || [];
  const { data: resumes = [], isLoading: resumesLoading } = useResumes();

  const history = useMemo(() => {
    const list = [...localHistory];
    const resumeHistory = resumes
      .map((resume) => historyFromTailoredResumeOrFallback(resume))
      .filter((entry): entry is TailorHistory => entry !== null);
    resumeHistory.forEach((dbEntry) => {
      const hasDuplicate = list.some(
        (h) =>
          h.id === dbEntry.id ||
          (h.tailoredResumeId && h.tailoredResumeId === dbEntry.tailoredResumeId),
      );
      if (!hasDuplicate) list.push(dbEntry);
    });
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [localHistory, resumes]);

  return { history: history.slice(0, limit), isLoading: !authReady || (resumesLoading && history.length === 0) };
}
