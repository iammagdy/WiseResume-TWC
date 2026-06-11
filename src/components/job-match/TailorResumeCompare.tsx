import { useState } from 'react';
import { Columns2, ScanSearch } from 'lucide-react';
import type { ResumeData, SuperTailorResult, TailorSectionId, TemplateId } from '@/types/resume';
import { TailorResumeCompareSlider } from './TailorResumeCompareSlider';
import { TailorSectionCompare } from './TailorSectionCompare';
import { cn } from '@/lib/utils';

export type TailorCompareMode = 'section' | 'full';

interface TailorResumeCompareProps {
  beforeResume: ResumeData;
  afterResume: ResumeData;
  templateId: TemplateId;
  appliedSections: TailorSectionId[];
  tailorResult?: SuperTailorResult | null;
  className?: string;
  defaultMode?: TailorCompareMode;
}

export function TailorResumeCompare({
  beforeResume,
  afterResume,
  templateId,
  appliedSections,
  tailorResult,
  className,
  defaultMode = 'section',
}: TailorResumeCompareProps) {
  const [mode, setMode] = useState<TailorCompareMode>(defaultMode);

  return (
    <div className={cn('jmw-compare-host', className)}>
      <div className="jmw-compare-host__modes" role="group" aria-label="Comparison mode">
        <button
          type="button"
          className={cn('jmw-compare-host__mode', mode === 'section' && 'jmw-compare-host__mode--active')}
          aria-pressed={mode === 'section'}
          onClick={() => setMode('section')}
        >
          <Columns2 className="w-3.5 h-3.5" aria-hidden />
          By section
        </button>
        <button
          type="button"
          className={cn('jmw-compare-host__mode', mode === 'full' && 'jmw-compare-host__mode--active')}
          aria-pressed={mode === 'full'}
          onClick={() => setMode('full')}
        >
          <ScanSearch className="w-3.5 h-3.5" aria-hidden />
          Full CV
        </button>
      </div>

      {mode === 'section' ? (
        <TailorSectionCompare
          beforeResume={beforeResume}
          afterResume={afterResume}
          templateId={templateId}
          appliedSections={appliedSections}
          tailorResult={tailorResult}
        />
      ) : (
        <TailorResumeCompareSlider
          beforeResume={beforeResume}
          afterResume={afterResume}
          templateId={templateId}
          tailorResult={tailorResult}
        />
      )}
    </div>
  );
}
