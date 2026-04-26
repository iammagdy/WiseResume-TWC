import { lazy, Suspense, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus, Trophy, Rocket, Award, BookOpen, Heart, Palette, Globe, Users, X } from 'lucide-react';
import { User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { SectionCard } from '@/components/editor/SectionCard';
import { SectionAIAction } from '@/components/editor/SectionAIAction';
import type { SectionType } from '@/components/editor/InlineAIButton';
import { ATSInlineSuggestions } from '@/components/editor/ATSInlineSuggestions';
import { AddSectionSheet } from '@/components/editor/AddSectionSheet';
import { getSectionStatus } from '@/lib/resumeCompletionRules';
import { ContactSectionSkeleton, SummarySectionSkeleton, ExperienceSectionSkeleton, EducationSectionSkeleton, SkillsSectionSkeleton, ListSectionSkeleton } from '@/components/editor/SectionSkeletons';
import type { SectionId } from '@/types/resume';
import type { ATSSuggestion, DeepResult } from '@/hooks/useATSSuggestions';

const ContactSection = lazy(() => import('@/components/editor/ContactSection').then(m => ({ default: m.ContactSection })));
const SummarySection = lazy(() => import('@/components/editor/SummarySection').then(m => ({ default: m.SummarySection })));
const ExperienceSection = lazy(() => import('@/components/editor/ExperienceSection').then(m => ({ default: m.ExperienceSection })));
const EducationSection = lazy(() => import('@/components/editor/EducationSection').then(m => ({ default: m.EducationSection })));
const SkillsSection = lazy(() => import('@/components/editor/SkillsSection').then(m => ({ default: m.SkillsSection })));
const AwardsSection = lazy(() => import('@/components/editor/AwardsSection').then(m => ({ default: m.AwardsSection })));
const ProjectsSection = lazy(() => import('@/components/editor/ProjectsSection').then(m => ({ default: m.ProjectsSection })));
const PublicationsSection = lazy(() => import('@/components/editor/PublicationsSection').then(m => ({ default: m.PublicationsSection })));
const VolunteeringSection = lazy(() => import('@/components/editor/VolunteeringSection').then(m => ({ default: m.VolunteeringSection })));
const HobbiesSection = lazy(() => import('@/components/editor/HobbiesSection').then(m => ({ default: m.HobbiesSection })));
const ReferencesSection = lazy(() => import('@/components/editor/ReferencesSection').then(m => ({ default: m.ReferencesSection })));
const CertificationsSection = lazy(() => import('@/components/editor/CertificationsSection').then(m => ({ default: m.CertificationsSection })));
const LanguagesSection = lazy(() => import('@/components/editor/LanguagesSection').then(m => ({ default: m.LanguagesSection })));

interface MoreSectionConfig {
  icon: LucideIcon;
  title: string;
  aiSection?: SectionType;
  Component: React.LazyExoticComponent<React.ComponentType>;
}

const MORE_SECTION_COMPONENTS: Record<string, MoreSectionConfig> = {
  awards: { icon: Trophy, title: 'Awards & Achievements', aiSection: 'awards', Component: AwardsSection },
  projects: { icon: Rocket, title: 'Projects', aiSection: 'projects', Component: ProjectsSection },
  certifications: { icon: Award, title: 'Certifications', aiSection: 'certifications', Component: CertificationsSection },
  publications: { icon: BookOpen, title: 'Publications', aiSection: 'publications', Component: PublicationsSection },
  volunteering: { icon: Heart, title: 'Volunteering', aiSection: 'volunteering', Component: VolunteeringSection },
  languages: { icon: Globe, title: 'Languages', aiSection: 'languages', Component: LanguagesSection },
  hobbies: { icon: Palette, title: 'Hobbies & Interests', Component: HobbiesSection },
  references: { icon: Users, title: 'References', Component: ReferencesSection },
};

const CORE_SECTION_IDS = ['contact', 'summary', 'experience', 'education', 'skills'];

function MoreSubSectionContent({
  moreSubSection,
  isOpen,
  onToggle,
}: {
  moreSubSection: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const config = MORE_SECTION_COMPONENTS[moreSubSection];
  if (!config) return null;
  const { icon, title, aiSection, Component } = config;
  return (
    <SectionCard
      icon={icon}
      title={title}
      action={aiSection ? <SectionAIAction section={aiSection} /> : undefined}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <Component />
    </SectionCard>
  );
}

export interface EditorScrollFormProps {
  steps: { id: string; label: string }[];
  sectionScores: Record<string, number>;
  moreSubSection: string | null;
  setMoreSubSection: (s: string | null) => void;
  jobDescription: string | null;
  getATSSuggestions: (section: string) => ATSSuggestion[];
  isAnalyzingSection: (section: string) => boolean;
  fetchDeepSuggestions: (section: SectionId) => Promise<void>;
  deepResults: Record<string, DeepResult | undefined>;
  handleApplyDeep: (section: SectionId, improved: unknown) => void;
  clearDeepResult: (section: SectionId) => void;
  onRequestJobDescription: () => void;
  onActiveSectionChange: (sectionId: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  expandSectionRef?: React.MutableRefObject<((id: string) => void) | null>;
}

const ONBOARDING_HINT_KEY = 'wr-onboarding-hint-seen';

export function EditorScrollForm({
  steps,
  sectionScores,
  moreSubSection,
  setMoreSubSection,
  jobDescription,
  getATSSuggestions,
  isAnalyzingSection,
  fetchDeepSuggestions,
  deepResults,
  handleApplyDeep,
  clearDeepResult,
  onRequestJobDescription,
  onActiveSectionChange,
  scrollContainerRef,
  expandSectionRef,
}: EditorScrollFormProps) {
  const [bannerDismissed, setBannerDismissed] = useState(
    () => !!localStorage.getItem(ONBOARDING_HINT_KEY)
  );
  const showOnboardingBanner = !bannerDismissed && sectionScores.contact === 0;

  const handleDismissBanner = () => {
    localStorage.setItem(ONBOARDING_HINT_KEY, 'true');
    setBannerDismissed(true);
  };

  // Compute the initial open state for all sections.
  // Core sections start open if they are empty (score === 0) to prompt new users to fill them in.
  // All other sections start collapsed.
  //
  // Product decision: this is intentionally mount-only (empty deps) so the open/closed state
  // isn't overwritten by mid-session score updates (e.g., user fills a section → score rises,
  // but the card stays open because the user is actively editing it). EditorScrollForm is keyed
  // by resumeId in EditorPage, so switching resumes forces a clean remount and recomputation.
  const initialOpenSections = useMemo<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    for (const id of CORE_SECTION_IDS) {
      result[id] = (sectionScores[id] ?? 0) === 0;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount — see comment above

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialOpenSections);

  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandSection = useCallback((id: string) => {
    setOpenSections(prev => {
      if (prev[id]) return prev; // already open
      return { ...prev, [id]: true };
    });
  }, []);

  // Register expandSection with the parent ref so EditorPage can call it
  useEffect(() => {
    if (expandSectionRef) {
      expandSectionRef.current = expandSection;
    }
    return () => {
      if (expandSectionRef) expandSectionRef.current = null;
    };
  }, [expandSectionRef, expandSection]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const id = (topEntry.target as HTMLElement).dataset.sectionId;
          if (id) {
            onActiveSectionChange(id);
          }
        }
      },
      {
        root: container,
        threshold: 0.2,
        rootMargin: '-10% 0px -60% 0px',
      }
    );

    const sectionEls = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    for (const el of sectionEls) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [steps, onActiveSectionChange, scrollContainerRef]);

  const optionalSteps = steps.filter(s => !['contact', 'summary', 'experience', 'education', 'skills', 'more'].includes(s.id));
  const hasMoreStep = steps.some(s => s.id === 'more');

  return (
    <div className="space-y-4 pb-8">
      {showOnboardingBanner && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground/80">
          <span className="text-base leading-none mt-0.5">👋</span>
          <p className="flex-1 leading-snug">
            <span className="font-medium text-foreground">Welcome!</span> Fill in each section — changes save automatically.
          </p>
          <button
            onClick={handleDismissBanner}
            aria-label="Dismiss hint"
            className="shrink-0 p-1 rounded-md hover:bg-primary/10 active:scale-95 transition-transform touch-manipulation"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Contact */}
      <section ref={setSectionRef('contact')} data-section-id="contact">
        <SectionCard
          icon={User}
          title="Contact Information"
          tip="Add your name, email, phone and LinkedIn — these appear at the top of your resume"
          status={getSectionStatus(sectionScores.contact)}
          action={<SectionAIAction section="contact" />}
          isOpen={openSections['contact'] ?? false}
          onToggle={() => toggleSection('contact')}
        >
          <Suspense fallback={<ContactSectionSkeleton />}><ContactSection /></Suspense>
        </SectionCard>
      </section>

      {/* Summary */}
      <section ref={setSectionRef('summary')} data-section-id="summary">
        <SectionCard
          icon={AlignLeft}
          title="Professional Summary"
          tip="Write 2–4 sentences about your experience and what you're looking for"
          status={getSectionStatus(sectionScores.summary)}
          action={<SectionAIAction section="summary" />}
          isOpen={openSections['summary'] ?? false}
          onToggle={() => toggleSection('summary')}
        >
          <Suspense fallback={<SummarySectionSkeleton />}><SummarySection /></Suspense>
          <ATSInlineSuggestions section="summary" suggestions={getATSSuggestions('summary')} isAnalyzing={isAnalyzingSection('summary')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['summary']} onApplyDeep={(improved) => handleApplyDeep('summary', improved)} onDiscardDeep={() => clearDeepResult('summary')} hasJobDescription={!!jobDescription?.trim()} onRequestJobDescription={onRequestJobDescription} />
        </SectionCard>
      </section>

      {/* Experience */}
      <section ref={setSectionRef('experience')} data-section-id="experience">
        <SectionCard
          icon={Briefcase}
          title="Work Experience"
          tip="Add your most recent job first — click an entry to expand and edit it"
          status={getSectionStatus(sectionScores.experience)}
          action={<SectionAIAction section="experience" />}
          isOpen={openSections['experience'] ?? false}
          onToggle={() => toggleSection('experience')}
        >
          <Suspense fallback={<ExperienceSectionSkeleton />}><ExperienceSection /></Suspense>
          <ATSInlineSuggestions section="experience" suggestions={getATSSuggestions('experience')} isAnalyzing={isAnalyzingSection('experience')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['experience']} onApplyDeep={(improved) => handleApplyDeep('experience', improved)} onDiscardDeep={() => clearDeepResult('experience')} hasJobDescription={!!jobDescription?.trim()} onRequestJobDescription={onRequestJobDescription} />
        </SectionCard>
      </section>

      {/* Education */}
      <section ref={setSectionRef('education')} data-section-id="education">
        <SectionCard
          icon={GraduationCap}
          title="Education"
          tip="List your highest degree first — GPA is optional"
          status={getSectionStatus(sectionScores.education)}
          action={<SectionAIAction section="education" />}
          isOpen={openSections['education'] ?? false}
          onToggle={() => toggleSection('education')}
        >
          <Suspense fallback={<EducationSectionSkeleton />}><EducationSection /></Suspense>
          {jobDescription && <ATSInlineSuggestions section="education" suggestions={getATSSuggestions('education')} isAnalyzing={isAnalyzingSection('education')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['education']} onApplyDeep={(improved) => handleApplyDeep('education', improved)} onDiscardDeep={() => clearDeepResult('education')} />}
        </SectionCard>
      </section>

      {/* Skills */}
      <section ref={setSectionRef('skills')} data-section-id="skills">
        <SectionCard
          icon={Wrench}
          title="Skills"
          tip="Add 6–10 skills matching the jobs you're applying to"
          status={getSectionStatus(sectionScores.skills)}
          action={<SectionAIAction section="skills" />}
          isOpen={openSections['skills'] ?? false}
          onToggle={() => toggleSection('skills')}
        >
          <Suspense fallback={<SkillsSectionSkeleton />}><SkillsSection /></Suspense>
          {jobDescription && <ATSInlineSuggestions section="skills" suggestions={getATSSuggestions('skills')} isAnalyzing={isAnalyzingSection('skills')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['skills']} onApplyDeep={(improved) => handleApplyDeep('skills', improved)} onDiscardDeep={() => clearDeepResult('skills')} />}
        </SectionCard>
      </section>

      {/* Optional sections already added to resume */}
      {optionalSteps.map(step => {
        const config = MORE_SECTION_COMPONENTS[step.id];
        if (!config) return null;
        const { icon, title, aiSection, Component } = config;
        return (
          <section key={step.id} ref={setSectionRef(step.id)} data-section-id={step.id}>
            <SectionCard
              icon={icon}
              title={title}
              action={aiSection ? <SectionAIAction section={aiSection} /> : undefined}
              isOpen={openSections[step.id] ?? false}
              onToggle={() => toggleSection(step.id)}
            >
              <Suspense fallback={<ListSectionSkeleton />}><Component /></Suspense>
            </SectionCard>
          </section>
        );
      })}

      {/* More sections — add new optional sections */}
      {hasMoreStep && (
        <section ref={setSectionRef('more')} data-section-id="more">
          {!moreSubSection ? (
            <SectionCard
              icon={Plus}
              title="More Sections"
              tip="Add optional sections to stand out"
              isCollapsible={false}
            >
              <AddSectionSheet onSelectSection={(s) => setMoreSubSection(s)} />
            </SectionCard>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setMoreSubSection(null)} className="text-sm text-primary flex items-center gap-1 active:scale-95 touch-manipulation min-h-[44px]">
                All Sections
              </button>
              <Suspense fallback={<ListSectionSkeleton />}>
                <MoreSubSectionContent
                  moreSubSection={moreSubSection!}
                  isOpen={openSections['more'] ?? false}
                  onToggle={() => toggleSection('more')}
                />
              </Suspense>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
