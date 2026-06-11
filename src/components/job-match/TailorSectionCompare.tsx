import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Briefcase,
  FileText,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { ResumeData, SuperTailorResult, TailorSectionId, TemplateId } from '@/types/resume';
import { SECTION_LABELS } from '@/lib/sectionLabels';
import {
  sliceResumeForCompareSection,
  tailorSectionHasChanges,
  TAILOR_COMPARE_SECTION_ORDER,
} from '@/lib/tailorSectionSlice';
import { applyTailorCompareHighlights } from '@/lib/tailorCompareHighlights';
import { ScaledResumePage } from './ScaledResumePage';
import { TailorDiffLegend } from './TailorDiffDisplay';
import { cn } from '@/lib/utils';

const SECTION_ICONS: Record<TailorSectionId, typeof FileText> = {
  summary: FileText,
  skills: Layers,
  experience: Briefcase,
  education: GraduationCap,
  projects: Sparkles,
  certifications: Award,
  awards: Award,
};

interface TailorSectionCompareProps {
  beforeResume: ResumeData;
  afterResume: ResumeData;
  templateId: TemplateId;
  appliedSections: TailorSectionId[];
  tailorResult?: SuperTailorResult | null;
  className?: string;
}

export function TailorSectionCompare({
  beforeResume,
  afterResume,
  templateId,
  appliedSections,
  tailorResult,
  className,
}: TailorSectionCompareProps) {
  const beforeInnerRef = useRef<HTMLElement | null>(null);
  const afterInnerRef = useRef<HTMLElement | null>(null);

  const visibleSections = useMemo(
    () => TAILOR_COMPARE_SECTION_ORDER.filter((id) => appliedSections.includes(id)),
    [appliedSections],
  );

  const sectionsWithChanges = useMemo(
    () => visibleSections.filter((s) => tailorSectionHasChanges(s, beforeResume, afterResume, tailorResult)),
    [visibleSections, beforeResume, afterResume, tailorResult],
  );

  const [activeSection, setActiveSection] = useState<TailorSectionId>(
    () => sectionsWithChanges[0] ?? visibleSections[0] ?? 'summary',
  );

  useEffect(() => {
    if (!visibleSections.includes(activeSection)) {
      setActiveSection(sectionsWithChanges[0] ?? visibleSections[0] ?? 'summary');
    }
  }, [activeSection, sectionsWithChanges, visibleSections]);

  const beforeSlice = useMemo(
    () => sliceResumeForCompareSection(beforeResume, activeSection),
    [activeSection, beforeResume],
  );
  const afterSlice = useMemo(
    () => sliceResumeForCompareSection(afterResume, activeSection),
    [activeSection, afterResume],
  );

  const applyHighlights = useCallback(() => {
    applyTailorCompareHighlights(beforeInnerRef.current, beforeSlice, afterSlice, tailorResult, { side: 'before' });
    applyTailorCompareHighlights(afterInnerRef.current, beforeSlice, afterSlice, tailorResult, { side: 'after' });
  }, [afterSlice, beforeSlice, tailorResult]);

  const handleBeforeMount = useCallback((root: HTMLElement | null) => {
    beforeInnerRef.current = root;
    requestAnimationFrame(() => applyHighlights());
  }, [applyHighlights]);

  const handleAfterMount = useCallback((root: HTMLElement | null) => {
    afterInnerRef.current = root;
    requestAnimationFrame(() => applyHighlights());
  }, [applyHighlights]);

  useEffect(() => {
    applyHighlights();
  }, [applyHighlights, templateId, activeSection]);

  if (!visibleSections.length) {
    return (
      <p className="text-sm text-muted-foreground px-4 py-8 text-center">
        No tailored sections to compare. Run tailoring with at least one section enabled.
      </p>
    );
  }

  return (
    <div className={cn('jmw-section-compare', className)}>
      <div className="jmw-section-compare__toolbar">
        <p className="jmw-section-compare__hint">
          Same font size on both sides — pick a section to compare what changed.
        </p>
        <TailorDiffLegend />
      </div>

      <div className="jmw-section-compare__tabs" role="tablist" aria-label="Tailored sections">
        {visibleSections.map((section) => {
          const Icon = SECTION_ICONS[section];
          const changed = sectionsWithChanges.includes(section);
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={activeSection === section}
              className={cn(
                'jmw-section-compare__tab',
                activeSection === section && 'jmw-section-compare__tab--active',
              )}
              onClick={() => setActiveSection(section)}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {SECTION_LABELS[section] ?? section}
              {changed && <span className="jmw-section-compare__tab-dot" aria-label="Has changes" />}
            </button>
          );
        })}
      </div>

      <div
        className="jmw-section-compare__panels"
        role="tabpanel"
        aria-label={`${SECTION_LABELS[activeSection] ?? activeSection} comparison`}
      >
        <div className="jmw-section-compare__panel jmw-section-compare__panel--before">
          <span className="jmw-section-compare__panel-badge">Before</span>
          <ScaledResumePage
            resume={beforeSlice}
            templateId={templateId}
            className="jmw-section-compare__page jmw-compare__before-doc"
            innerClassName="jmw-compare__before-doc"
            onMount={handleBeforeMount}
            compact
          />
        </div>
        <div className="jmw-section-compare__panel jmw-section-compare__panel--after">
          <span className="jmw-section-compare__panel-badge jmw-section-compare__panel-badge--after">After</span>
          <ScaledResumePage
            resume={afterSlice}
            templateId={templateId}
            className="jmw-section-compare__page"
            innerClassName="jmw-compare__after-doc"
            onMount={handleAfterMount}
            compact
          />
        </div>
      </div>
    </div>
  );
}
