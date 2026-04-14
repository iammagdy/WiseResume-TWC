import { useState, useMemo } from 'react';
import { ScanLine, X, CheckCircle, AlertCircle, Info, LayoutList, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  extractKeywords,
  checkKeywordsInResume,
  checkKeywordsPerSection,
  segmentTextForHighlight,
  buildResumeTextFromData,
  type ExtractedKeyword,
  type SectionCoverage,
} from '@/lib/keywordExtractor';
import type { ResumeData } from '@/types/resume';

interface KeywordHighlighterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentResume: ResumeData | null;
}

interface KeywordResult {
  keywords: ExtractedKeyword[];
  present: string[];
  missing: string[];
  sectionCoverage: SectionCoverage[];
}

/** Renders a text string with present keywords highlighted green, missing keywords highlighted amber. */
function HighlightedText({
  text,
  present,
  missing,
}: {
  text: string;
  present: string[];
  missing: string[];
}) {
  const segments = useMemo(
    () => segmentTextForHighlight(text, present, missing),
    [text, present, missing],
  );

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'present') {
          return (
            <mark
              key={i}
              className="bg-green-200/80 dark:bg-green-800/50 text-green-900 dark:text-green-100 rounded px-0.5 not-italic"
            >
              {seg.text}
            </mark>
          );
        }
        if (seg.type === 'missing') {
          return (
            <mark
              key={i}
              className="bg-amber-200/80 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 rounded px-0.5 not-italic"
            >
              {seg.text}
            </mark>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}

function HighlightedResumeContent({
  resume,
  present,
  missing,
}: {
  resume: ResumeData;
  present: string[];
  missing: string[];
}) {
  const skillNames = useMemo(() => {
    return (resume.skills || []).map(s => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object' && 'name' in s) return String((s as { name?: unknown }).name || '');
      return '';
    }).filter(Boolean);
  }, [resume.skills]);

  return (
    <div className="space-y-4 text-sm">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <mark className="bg-green-200/80 dark:bg-green-800/50 text-green-900 dark:text-green-100 rounded px-1.5 py-0.5">
            present
          </mark>
          <span className="text-muted-foreground">keyword found</span>
        </div>
        <div className="flex items-center gap-1.5">
          <mark className="bg-amber-200/80 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 rounded px-1.5 py-0.5">
            missing
          </mark>
          <span className="text-muted-foreground">gap to fill</span>
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
          <p className="text-xs leading-relaxed text-foreground">
            <HighlightedText text={resume.summary} present={present} missing={missing} />
          </p>
        </div>
      )}

      {/* Skills */}
      {skillNames.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</p>
          <div className="flex flex-wrap gap-1">
            {skillNames.map((skill, i) => {
              const lower = skill.toLowerCase();
              const isPresent = present.some(p => lower.includes(p.toLowerCase()) || p.toLowerCase().includes(lower));
              return (
                <span
                  key={i}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border',
                    isPresent
                      ? 'bg-green-100 dark:bg-green-900/40 border-green-400/50 text-green-800 dark:text-green-200'
                      : 'bg-muted border-border text-muted-foreground',
                  )}
                >
                  {skill}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Experience */}
      {(resume.experience || []).map((exp, i) => (
        <div key={i} className="space-y-1 border-l-2 border-muted pl-3">
          <p className="text-xs font-semibold text-foreground">
            <HighlightedText text={`${exp.position || ''} — ${exp.company || ''}`} present={present} missing={missing} />
          </p>
          {exp.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <HighlightedText text={exp.description} present={present} missing={missing} />
            </p>
          )}
          {(exp.achievements || []).length > 0 && (
            <ul className="space-y-0.5">
              {exp.achievements.slice(0, 3).map((ach, j) => (
                <li key={j} className="text-xs text-muted-foreground before:content-['•'] before:mr-1">
                  <HighlightedText text={ach} present={present} missing={missing} />
                </li>
              ))}
              {exp.achievements.length > 3 && (
                <li className="text-xs text-muted-foreground italic">+{exp.achievements.length - 3} more…</li>
              )}
            </ul>
          )}
        </div>
      ))}

      {/* Education */}
      {(resume.education || []).map((edu, i) => (
        <div key={i} className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">
            <HighlightedText text={`${edu.degree || ''} ${edu.field || ''}`} present={present} missing={missing} />
          </p>
          <p className="text-xs text-muted-foreground">
            <HighlightedText text={edu.institution || ''} present={present} missing={missing} />
          </p>
        </div>
      ))}
    </div>
  );
}

function SectionBar({ coverage }: { coverage: SectionCoverage }) {
  const pct = coverage.coveragePercent;
  const color = pct >= 50 ? 'bg-green-500' : pct >= 25 ? 'bg-amber-500' : 'bg-orange-400';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{coverage.section}</span>
        <span className={cn(
          'text-xs font-semibold tabular-nums',
          pct >= 50 ? 'text-green-600 dark:text-green-400' : pct >= 25 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-500',
        )}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {coverage.matchingKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {coverage.matchingKeywords.slice(0, 6).map(kw => (
            <span
              key={kw}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
            >
              {kw}
            </span>
          ))}
          {coverage.matchingKeywords.length > 6 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{coverage.matchingKeywords.length - 6}
            </span>
          )}
        </div>
      )}
      {coverage.matchingKeywords.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic">No keywords found in this section</p>
      )}
    </div>
  );
}

export function KeywordHighlighterSheet({
  open,
  onOpenChange,
  currentResume,
}: KeywordHighlighterSheetProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [showContentView, setShowContentView] = useState(false);

  const resumeText = useMemo(() => {
    if (!currentResume) return '';
    return buildResumeTextFromData(currentResume);
  }, [currentResume]);

  const handleExtract = () => {
    if (!jobDescription.trim() || !currentResume) return;
    const keywords = extractKeywords(jobDescription, 40);
    const { present, missing } = checkKeywordsInResume(keywords, resumeText);
    const sectionCoverage = checkKeywordsPerSection(keywords, currentResume);
    setResult({ keywords, present, missing, sectionCoverage });
    setShowContentView(false);
  };

  const handleClear = () => {
    setJobDescription('');
    setResult(null);
    setShowContentView(false);
  };

  const matchPercent = result
    ? Math.round((result.present.length / Math.max(result.present.length + result.missing.length, 1)) * 100)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            <SheetTitle>Keyword Matcher</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste a job description to see which keywords your resume covers — with inline highlighting in the resume content below.
            Runs entirely in your browser, no AI credits used.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Job description input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Job Description</label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[140px] text-sm resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExtract}
              disabled={!jobDescription.trim() || !currentResume}
              className="flex-1 min-h-[44px]"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Analyze Keywords
            </Button>
            {result && (
              <Button variant="outline" onClick={handleClear} className="min-h-[44px]">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!currentResume && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-xl">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">Open a resume in the editor to use keyword matching.</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Match score */}
              <div className="bg-card border border-border rounded-xl p-4 text-center space-y-2">
                <div className="relative mx-auto w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke={matchPercent! >= 70 ? '#22c55e' : matchPercent! >= 40 ? '#eab308' : '#f97316'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - matchPercent! / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      'text-lg font-bold',
                      matchPercent! >= 70 ? 'text-green-500' : matchPercent! >= 40 ? 'text-yellow-500' : 'text-orange-500',
                    )}>
                      {matchPercent}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {matchPercent! >= 70 ? 'Strong Match' : matchPercent! >= 40 ? 'Moderate Match' : 'Weak Match'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.present.length} of {result.present.length + result.missing.length} keywords found
                  </p>
                </div>
              </div>

              {/* Inline highlighted resume content view */}
              {currentResume && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowContentView(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Resume Content — Highlighted</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{showContentView ? 'Hide' : 'Show'}</span>
                  </button>
                  {showContentView && (
                    <div className="border-t border-border px-4 py-4">
                      <HighlightedResumeContent
                        resume={currentResume}
                        present={result.present}
                        missing={result.missing}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Section-level coverage breakdown */}
              {result.sectionCoverage.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-1.5">
                    <LayoutList className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Coverage by Section</p>
                  </div>
                  <div className="space-y-4">
                    {result.sectionCoverage.map((sec) => (
                      <SectionBar key={sec.section} coverage={sec} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sections with low coverage are the best places to add missing keywords naturally.
                  </p>
                </div>
              )}

              {/* Present keywords */}
              {result.present.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium text-foreground">Present in resume ({result.present.length})</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.present.map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="text-xs border-green-500/40 text-green-700 bg-green-500/5 dark:text-green-400"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing keywords */}
              {result.missing.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-medium text-foreground">Missing from resume ({result.missing.length})</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing.slice(0, 20).map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="text-xs border-amber-500/40 text-amber-700 bg-amber-500/5 dark:text-amber-400"
                      >
                        {kw}
                      </Badge>
                    ))}
                    {result.missing.length > 20 && (
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                        +{result.missing.length - 20} more
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consider adding these keywords naturally to the sections with lowest coverage above.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
