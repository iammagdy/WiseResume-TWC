import { useMemo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'we', 'you',
  'they', 'he', 'she', 'it', 'i', 'me', 'my', 'your', 'our', 'their',
  'this', 'that', 'these', 'those', 'not', 'no', 'all', 'each', 'every',
  'any', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
  'very', 'just', 'about', 'above', 'after', 'again', 'also', 'am',
  'because', 'before', 'between', 'both', 'during', 'here', 'how', 'if',
  'into', 'its', 'let', 'like', 'make', 'many', 'much', 'new', 'now',
  'only', 'over', 'own', 'same', 'so', 'then', 'there', 'through', 'under',
  'up', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'work', 'working', 'ability', 'experience', 'including', 'within', 'well',
  'strong', 'excellent', 'required', 'preferred', 'etc', 'role', 'position',
  'company', 'team', 'join', 'looking', 'seeking', 'candidate', 'ideal',
  'will', 'must', 'using', 'used', 'use', 'based', 'related', 'across',
]);

function extractMeaningfulWords(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-\/\+\#\.]/g, ' ').split(/\s+/);
  const keywords = new Set<string>();
  for (const word of words) {
    if (word.length >= 4 && !STOP_WORDS.has(word)) {
      keywords.add(word);
    }
  }
  return Array.from(keywords).slice(0, 30);
}

function computeMatchPercent(jobDescription: string, resumeText: string): number {
  if (!jobDescription.trim() || !resumeText.trim()) return 0;
  const keywords = extractMeaningfulWords(jobDescription);
  if (keywords.length === 0) return 0;
  const lowerResume = resumeText.toLowerCase();
  const found = keywords.filter(kw => lowerResume.includes(kw)).length;
  return Math.round((found / keywords.length) * 100);
}

interface KeywordMatchBarProps {
  jobDescription: string;
  resumeText: string;
  className?: string;
}

export function KeywordMatchBar({ jobDescription, resumeText, className }: KeywordMatchBarProps) {
  const [debouncedJob, setDebouncedJob] = useState(jobDescription);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedJob(jobDescription);
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [jobDescription]);

  const matchPercent = useMemo(
    () => computeMatchPercent(debouncedJob, resumeText),
    [debouncedJob, resumeText]
  );

  if (!debouncedJob.trim()) return null;

  const color =
    matchPercent >= 70 ? 'text-success' :
    matchPercent >= 40 ? 'text-warning' :
    'text-destructive';

  const ringColor =
    matchPercent >= 70 ? 'stroke-success' :
    matchPercent >= 40 ? 'stroke-warning' :
    'stroke-destructive';

  const circumference = 2 * Math.PI * 9;
  const dash = (matchPercent / 100) * circumference;

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border', className)} role="status" aria-live="polite">
      <svg width="28" height="28" viewBox="0 0 24 24" className="shrink-0 -rotate-90">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" />
        <circle
          cx="12" cy="12" r="9" fill="none" strokeWidth="2.5"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className={cn('transition-all duration-500', ringColor)}
        />
      </svg>
      <span className={cn('text-sm font-semibold tabular-nums', color)}>
        {matchPercent}% match
      </span>
    </div>
  );
}
