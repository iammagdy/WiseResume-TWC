import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { compareSkills, diffText, type TextDiff } from '@/lib/diffUtils';
import { cn } from '@/lib/utils';
import type { BulletTransformation } from '@/types/resume';
import { Minus, Plus } from 'lucide-react';

export function TailorDiffLegend({ className }: { className?: string }) {
  return (
    <div className={cn('jmw-diff-legend', className)} aria-label="Change legend">
      <span className="jmw-diff-legend__item">
        <span className="jmw-diff-legend__swatch jmw-diff-legend__swatch--added" aria-hidden />
        Added / tailored
      </span>
      <span className="jmw-diff-legend__item">
        <span className="jmw-diff-legend__swatch jmw-diff-legend__swatch--removed" aria-hidden />
        Removed
      </span>
    </div>
  );
}

export function InlineTextDiff({ diffs, className }: { diffs: TextDiff[]; className?: string }) {
  return (
    <p className={cn('jmw-diff-text leading-relaxed', className)}>
      {diffs.map((d, i) => (
        <span
          key={i}
          className={cn(
            d.type === 'removed' && 'jmw-diff-text__removed',
            d.type === 'added' && 'jmw-diff-text__added',
          )}
        >
          {d.text}{' '}
        </span>
      ))}
    </p>
  );
}

export function SkillsDiffGrid({ original, tailored }: { original: string[]; tailored: string[] }) {
  const diff = compareSkills(original, tailored);
  if (diff.added.length === 0 && diff.removed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Skills order or grouping was refined; wording is unchanged.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {diff.removed.map((s, i) => (
        <Badge key={`r-${i}`} variant="outline" className="jmw-skill-chip jmw-skill-chip--removed">
          <Minus className="w-3 h-3" aria-hidden />
          {s}
        </Badge>
      ))}
      {diff.unchanged.map((s, i) => (
        <Badge key={`u-${i}`} variant="secondary" className="jmw-skill-chip">
          {s}
        </Badge>
      ))}
      {diff.added.map((s, i) => (
        <Badge key={`a-${i}`} variant="outline" className="jmw-skill-chip jmw-skill-chip--added">
          <Plus className="w-3 h-3" aria-hidden />
          {s}
        </Badge>
      ))}
    </div>
  );
}

export function BulletChangeList({ bullets }: { bullets: BulletTransformation[] }) {
  if (!bullets.length) {
    return <p className="text-sm text-muted-foreground">No achievement bullets were rewritten for this section.</p>;
  }
  return (
    <div className="space-y-3">
      {bullets.map((bt) => (
        <div key={`${bt.experienceId}-${bt.bulletIndex}`} className="jmw-bullet-change">
          <p className="jmw-bullet-change__before">{bt.originalBullet}</p>
          <p className="jmw-bullet-change__after">{bt.enhancedBullet}</p>
          {bt.improvement && (
            <p className="jmw-bullet-change__note">{bt.improvement}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function BeforeAfterColumns({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After (highlighted)',
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  return (
    <div className="jmw-before-after">
      <div className="jmw-before-after__col jmw-before-after__col--before">
        <p className="jmw-before-after__label">{beforeLabel}</p>
        <div className="jmw-before-after__body">{before}</div>
      </div>
      <div className="jmw-before-after__col jmw-before-after__col--after">
        <p className="jmw-before-after__label">{afterLabel}</p>
        <div className="jmw-before-after__body">{after}</div>
      </div>
    </div>
  );
}
