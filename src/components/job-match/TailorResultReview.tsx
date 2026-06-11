import { useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  FileText,
  GraduationCap,
  Layers,
  ListChecks,
  Sparkles,
  SplitSquareHorizontal,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SECTION_LABELS } from '@/lib/sectionLabels';
import { diffText } from '@/lib/diffUtils';
import { cn } from '@/lib/utils';
import type {
  BulletTransformation,
  ResumeData,
  SuperTailorResult,
  TailorSectionId,
} from '@/types/resume';
import {
  BeforeAfterColumns,
  BulletChangeList,
  InlineTextDiff,
  SkillsDiffGrid,
  TailorDiffLegend,
} from './TailorDiffDisplay';

const SECTION_ORDER: TailorSectionId[] = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'awards',
];

const SECTION_ICONS: Record<TailorSectionId, typeof FileText> = {
  summary: FileText,
  skills: Layers,
  experience: Briefcase,
  education: GraduationCap,
  projects: Sparkles,
  certifications: Award,
  awards: Award,
};

type ReviewView = 'split' | 'highlight';

interface TailorResultReviewProps {
  originalResume: ResumeData;
  tailoredResume: ResumeData;
  tailorResult: SuperTailorResult;
  appliedSections: TailorSectionId[];
  className?: string;
}

function sectionHasChanges(
  section: TailorSectionId,
  original: ResumeData,
  tailored: ResumeData,
  tailorResult: SuperTailorResult,
): boolean {
  switch (section) {
    case 'summary':
      return (original.summary || '').trim() !== (tailored.summary || '').trim();
    case 'skills':
      return JSON.stringify(original.skills) !== JSON.stringify(tailored.skills);
    case 'experience':
      return (
        (tailorResult.bulletTransformations?.length ?? 0) > 0 ||
        JSON.stringify(original.experience) !== JSON.stringify(tailored.experience)
      );
    case 'education':
      return JSON.stringify(original.education) !== JSON.stringify(tailored.education);
    case 'projects':
      return JSON.stringify(original.projects ?? []) !== JSON.stringify(tailored.projects ?? []);
    case 'certifications':
      return JSON.stringify(original.certifications ?? []) !== JSON.stringify(tailored.certifications ?? []);
    case 'awards':
      return JSON.stringify(original.awards ?? []) !== JSON.stringify(tailored.awards ?? []);
    default:
      return false;
  }
}

function bulletsForExperience(
  tailorResult: SuperTailorResult,
): BulletTransformation[] {
  return tailorResult.bulletTransformations ?? [];
}

function formatEducationLine(edu: ResumeData['education'][number]) {
  const degree = [edu.degree, edu.field].filter(Boolean).join(' in ');
  return [degree, edu.institution].filter(Boolean).join(' — ');
}

export function TailorResultReview({
  originalResume,
  tailoredResume,
  tailorResult,
  appliedSections,
  className,
}: TailorResultReviewProps) {
  const activeSections = useMemo(
    () => SECTION_ORDER.filter((s) => appliedSections.includes(s)),
    [appliedSections],
  );

  const sectionsWithChanges = useMemo(
    () => activeSections.filter((s) => sectionHasChanges(s, originalResume, tailoredResume, tailorResult)),
    [activeSections, originalResume, tailoredResume, tailorResult],
  );

  const [activeSection, setActiveSection] = useState<TailorSectionId>(
    () => sectionsWithChanges[0] ?? activeSections[0] ?? 'summary',
  );
  const [view, setView] = useState<ReviewView>('highlight');

  const keyChanges = useMemo(() => {
    const raw = tailorResult.keyChanges ?? [];
    return raw.map((item) => (typeof item === 'string' ? item : item.description ?? '')).filter(Boolean);
  }, [tailorResult.keyChanges]);

  const matchedKeywords = tailorResult.atsAnalysis?.matchedKeywords?.slice(0, 8) ?? [];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'summary': {
        const before = originalResume.summary || '—';
        const after = tailoredResume.summary || '—';
        const diffs = diffText(before, after);
        if (view === 'split') {
          return (
            <BeforeAfterColumns
              before={<p className="text-sm text-muted-foreground whitespace-pre-wrap">{before}</p>}
              after={<InlineTextDiff diffs={diffs} className="text-sm" />}
            />
          );
        }
        return <InlineTextDiff diffs={diffs} className="text-sm" />;
      }
      case 'skills': {
        const before = originalResume.skills ?? [];
        const after = tailoredResume.skills ?? [];
        if (view === 'split') {
          return (
            <BeforeAfterColumns
              before={
                <div className="flex flex-wrap gap-1.5">
                  {before.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              }
              after={<SkillsDiffGrid original={before} tailored={after} />}
            />
          );
        }
        return <SkillsDiffGrid original={before} tailored={after} />;
      }
      case 'experience': {
        const bullets = bulletsForExperience(tailorResult);
        if (bullets.length > 0) {
          return <BulletChangeList bullets={bullets} />;
        }
        return (
          <div className="space-y-4">
            {tailoredResume.experience.map((exp, i) => {
              const orig = originalResume.experience[i];
              const origBullets = orig?.achievements ?? [];
              const newBullets = exp.achievements ?? [];
              return (
                <div key={exp.id || i} className="jmw-exp-block">
                  <p className="jmw-exp-block__title">
                    {exp.position}
                    <span className="text-muted-foreground font-normal"> @ {exp.company}</span>
                  </p>
                  {newBullets.map((bullet, bi) => {
                    const originalBullet = origBullets[bi] ?? '';
                    if (!originalBullet && !bullet) return null;
                    if (originalBullet === bullet) {
                      return <p key={bi} className="text-sm text-muted-foreground pl-3 border-l-2 border-border/50">{bullet}</p>;
                    }
                    return (
                      <div key={bi} className="jmw-bullet-change">
                        {originalBullet && <p className="jmw-bullet-change__before">{originalBullet}</p>}
                        <p className="jmw-bullet-change__after">{bullet}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      }
      case 'education': {
        const pairs = tailoredResume.education.map((edu, i) => ({
          before: formatEducationLine(originalResume.education[i] ?? edu),
          after: formatEducationLine(edu),
        }));
        if (view === 'split') {
          return (
            <BeforeAfterColumns
              before={
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {pairs.map((p, i) => <li key={i}>{p.before}</li>)}
                </ul>
              }
              after={
                <ul className="space-y-2 text-sm">
                  {pairs.map((p, i) => (
                    <li key={i}><InlineTextDiff diffs={diffText(p.before, p.after)} /></li>
                  ))}
                </ul>
              }
            />
          );
        }
        return (
          <ul className="space-y-2">
            {pairs.map((p, i) => (
              <li key={i} className="text-sm">
                <InlineTextDiff diffs={diffText(p.before, p.after)} />
              </li>
            ))}
          </ul>
        );
      }
      default:
        return (
          <p className="text-sm text-muted-foreground">
            This section was included in tailoring. Open the full editor to compare line-by-line.
          </p>
        );
    }
  };

  if (!activeSections.length) {
    return null;
  }

  return (
    <section className={cn('jmw-review', className)} aria-label="Tailoring review">
      <div className="jmw-review__header">
        <div className="jmw-review__header-copy">
          <div className="jmw-review__eyebrow">
            <Wand2 className="w-3.5 h-3.5" aria-hidden />
            Tailoring intelligence
          </div>
          <h2 className="jmw-review__title">Before &amp; after review</h2>
          <p className="jmw-review__subtitle">
            Every highlighted word was added or rewritten for this role. Verify the changes before you export.
          </p>
        </div>
        <div className="jmw-review__view-toggle" role="group" aria-label="Comparison view">
          <Button
            type="button"
            size="sm"
            variant={view === 'highlight' ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => setView('highlight')}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            Highlights
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'split' ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => setView('split')}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            Side by side
          </Button>
        </div>
      </div>

      {keyChanges.length > 0 && (
        <div className="jmw-review__insights">
          <p className="jmw-review__insights-label">
            <ListChecks className="w-3.5 h-3.5" aria-hidden />
            Key changes ({keyChanges.length})
          </p>
          <ul className="jmw-review__insights-list">
            {keyChanges.slice(0, 6).map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </div>
      )}

      {matchedKeywords.length > 0 && (
        <div className="jmw-review__keywords">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            ATS keywords boosted
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((kw) => (
              <Badge key={kw.keyword} variant="outline" className="jmw-keyword-chip">
                {kw.keyword}
                {kw.tailoredCount > kw.originalCount && (
                  <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                    +{kw.tailoredCount - kw.originalCount}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <TailorDiffLegend className="mb-3" />

      <div className="jmw-review__tabs" role="tablist" aria-label="Resume sections">
        {activeSections.map((section) => {
          const Icon = SECTION_ICONS[section];
          const changed = sectionsWithChanges.includes(section);
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={activeSection === section}
              className={cn('jmw-review__tab', activeSection === section && 'jmw-review__tab--active')}
              onClick={() => setActiveSection(section)}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {SECTION_LABELS[section] ?? section}
              {changed && <span className="jmw-review__tab-dot" aria-label="Has changes" />}
            </button>
          );
        })}
      </div>

      <div className="jmw-review__panel" role="tabpanel">
        <p className="jmw-review__panel-label">{SECTION_LABELS[activeSection] ?? activeSection}</p>
        {renderSectionContent()}
      </div>
    </section>
  );
}
