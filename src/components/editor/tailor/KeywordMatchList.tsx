import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MatchedKeyword, SkillSuggestion } from '@/types/resume';

interface KeywordMatchListProps {
  matchedKeywords?: MatchedKeyword[];
  unmatchedKeywords?: string[];
  criticalKeywords?: string[];
  missingSkills?: SkillSuggestion[];
  className?: string;
}

type Tab = 'all' | 'missing' | 'found' | 'hard' | 'soft';

interface KeywordEntry {
  keyword: string;
  matched: boolean;
  count?: number;
  type?: 'hard' | 'soft';
}

export function KeywordMatchList({
  matchedKeywords = [],
  unmatchedKeywords = [],
  criticalKeywords = [],
  missingSkills = [],
  className,
}: KeywordMatchListProps) {
  const [tab, setTab] = useState<Tab>('all');

  const skillTypeMap = new Map<string, 'hard' | 'soft'>(
    missingSkills.filter(s => s.type).map(s => [s.skill.toLowerCase(), s.type!]),
  );

  const allKeywords: KeywordEntry[] = [];

  if (matchedKeywords.length > 0 || unmatchedKeywords.length > 0) {
    matchedKeywords
      .slice()
      .sort((a, b) => a.keyword.localeCompare(b.keyword))
      .forEach(m => {
        allKeywords.push({
          keyword: m.keyword,
          matched: true,
          count: m.tailoredCount,
          type: skillTypeMap.get(m.keyword.toLowerCase()),
        });
      });

    unmatchedKeywords
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .forEach(k => {
        allKeywords.push({
          keyword: k,
          matched: false,
          type: skillTypeMap.get(k.toLowerCase()),
        });
      });
  } else if (criticalKeywords.length > 0) {
    criticalKeywords
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .forEach(k => {
        allKeywords.push({
          keyword: k,
          matched: false,
          type: skillTypeMap.get(k.toLowerCase()),
        });
      });
  }

  if (!allKeywords.length) return null;

  const matched = allKeywords.filter(k => k.matched);
  const missing = allKeywords.filter(k => !k.matched);
  const hardSkills = allKeywords.filter(k => k.type === 'hard');
  const softSkills = allKeywords.filter(k => k.type === 'soft');
  const matchPct = Math.round((matched.length / allKeywords.length) * 100);

  const visible: KeywordEntry[] =
    tab === 'all' ? allKeywords :
    tab === 'missing' ? missing :
    tab === 'found' ? matched :
    tab === 'hard' ? hardSkills :
    softSkills;

  const hasTypedSkills = hardSkills.length > 0 || softSkills.length > 0;

  const tabs: [Tab, string][] = [
    ['all', `All (${allKeywords.length})`],
    ['missing', `Missing (${missing.length})`],
    ['found', `Found (${matched.length})`],
    ...(hasTypedSkills
      ? [
          ['hard', `Hard (${hardSkills.length})`] as [Tab, string],
          ['soft', `Soft (${softSkills.length})`] as [Tab, string],
        ]
      : []),
  ];

  return (
    <div className={cn('p-4 rounded-xl bg-card border border-border space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm">ATS Keywords</h4>
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            matchPct >= 70
              ? 'text-success'
              : matchPct >= 40
                ? 'text-amber-500'
                : 'text-destructive',
          )}
        >
          {matched.length}/{allKeywords.length} matched ({matchPct}%)
        </span>
      </div>

      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 flex-wrap">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 text-[11px] py-1 px-2 rounded-md transition-all min-w-fit',
              tab === id
                ? 'bg-background shadow-sm text-foreground font-medium'
                : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ keyword, matched: isMatched, count, type }) => (
          <Badge
            key={keyword}
            variant="outline"
            className={cn(
              'text-[11px] px-2 py-0.5 gap-1',
              isMatched
                ? 'bg-success/10 text-success border-success/30'
                : type === 'soft'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'bg-destructive/10 text-destructive border-destructive/30',
            )}
          >
            {keyword}
            {isMatched && count !== undefined && count > 0 && (
              <span className="opacity-70 text-[10px]">×{count}</span>
            )}
          </Badge>
        ))}
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground">No keywords in this category.</p>
        )}
      </div>
    </div>
  );
}
