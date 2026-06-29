import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Eye, Plus, Trophy, Rocket, Award, BookOpen, Heart, Palette, Globe, Users, X } from 'lucide-react';
import { User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { SectionCard } from '@/components/editor/SectionCard';
import { SectionAIAction } from '@/components/editor/SectionAIAction';
import type { SectionType } from '@/components/editor/InlineAIButton';
import { ATSInlineSuggestions } from '@/components/editor/ATSInlineSuggestions';
import { AddSectionSheet } from '@/components/editor/AddSectionSheet';
import { getSectionStatus } from '@/lib/resumeCompletionRules';
import { ContactSectionSkeleton, SummarySectionSkeleton, ExperienceSectionSkeleton, EducationSectionSkeleton, SkillsSectionSkeleton, ListSectionSkeleton } from '@/components/editor/SectionSkeletons';
import haptics from '@/lib/haptics';
import type { SectionId } from '@/types/resume';
import type { ATSSuggestion, DeepResult } from '@/hooks/useATSSuggestions';
import { useLocale } from '@/i18n/LocaleProvider';

const ContactSection = lazyWithRetry(() => import('@/components/editor/ContactSection').then(m => ({ default: m.ContactSection })));
const SummarySection = lazyWithRetry(() => import('@/components/editor/SummarySection').then(m => ({ default: m.SummarySection })));
const ExperienceSection = lazyWithRetry(() => import('@/components/editor/ExperienceSection').then(m => ({ default: m.ExperienceSection })));
const EducationSection = lazyWithRetry(() => import('@/components/editor/EducationSection').then(m => ({ default: m.EducationSection })));
const SkillsSection = lazyWithRetry(() => import('@/components/editor/SkillsSection').then(m => ({ default: m.SkillsSection })));
const AwardsSection = lazyWithRetry(() => import('@/components/editor/AwardsSection').then(m => ({ default: m.AwardsSection })));
const ProjectsSection = lazyWithRetry(() => import('@/components/editor/ProjectsSection').then(m => ({ default: m.ProjectsSection })));
const PublicationsSection = lazyWithRetry(() => import('@/components/editor/PublicationsSection').then(m => ({ default: m.PublicationsSection })));
const VolunteeringSection = lazyWithRetry(() => import('@/components/editor/VolunteeringSection').then(m => ({ default: m.VolunteeringSection })));
const HobbiesSection = lazyWithRetry(() => import('@/components/editor/HobbiesSection').then(m => ({ default: m.HobbiesSection })));
const ReferencesSection = lazyWithRetry(() => import('@/components/editor/ReferencesSection').then(m => ({ default: m.ReferencesSection })));
const CertificationsSection = lazyWithRetry(() => import('@/components/editor/CertificationsSection').then(m => ({ default: m.CertificationsSection })));
const LanguagesSection = lazyWithRetry(() => import('@/components/editor/LanguagesSection').then(m => ({ default: m.LanguagesSection })));

const MORE_SECTION_COMPONENTS: Record<string, { icon: LucideIcon; titleKey: string; defaultTitle: string; hasAI: boolean; Component: React.LazyExoticComponent<React.ComponentType> }> = {
  awards: { icon: Trophy, titleKey: 'editor.sections.awardsTitle', defaultTitle: 'Awards & Achievements', hasAI: true, Component: AwardsSection },
  projects: { icon: Rocket, titleKey: 'editor.sections.projectsTitle', defaultTitle: 'Projects', hasAI: true, Component: ProjectsSection },
  certifications: { icon: Award, titleKey: 'editor.sections.certificationsTitle', defaultTitle: 'Certifications', hasAI: true, Component: CertificationsSection },
  publications: { icon: BookOpen, titleKey: 'editor.sections.publicationsTitle', defaultTitle: 'Publications', hasAI: true, Component: PublicationsSection },
  volunteering: { icon: Heart, titleKey: 'editor.sections.volunteeringTitle', defaultTitle: 'Volunteering', hasAI: true, Component: VolunteeringSection },
  languages: { icon: Globe, titleKey: 'editor.sections.languagesTitle', defaultTitle: 'Languages', hasAI: true, Component: LanguagesSection },
  hobbies: { icon: Palette, titleKey: 'editor.sections.hobbiesTitle', defaultTitle: 'Hobbies & Interests', hasAI: false, Component: HobbiesSection },
  references: { icon: Users, titleKey: 'editor.sections.referencesTitle', defaultTitle: 'References', hasAI: false, Component: ReferencesSection },
};

export interface EditorSectionContentProps {
  activeTab: string;
  sectionScores: Record<string, number>;
  moreSubSection: string | null;
  setMoreSubSection: (s: string | null) => void;
  steps: { id: string; label: string }[];
  handleTabChange: (tab: string) => void;
  jobDescription: string | null;
  getATSSuggestions: (section: string) => ATSSuggestion[];
  isAnalyzingSection: (section: string) => boolean;
  fetchDeepSuggestions: (section: SectionId) => Promise<void>;
  deepResults: Record<string, DeepResult | undefined>;
  handleApplyDeep: (section: SectionId, improved: unknown) => void;
  clearDeepResult: (section: SectionId) => void;
  onRequestJobDescription: () => void;
}

const ONBOARDING_HINT_KEY = 'wr-onboarding-hint-seen';

export function EditorSectionContent({
  activeTab,
  sectionScores,
  moreSubSection,
  setMoreSubSection,
  steps,
  handleTabChange,
  jobDescription,
  getATSSuggestions,
  isAnalyzingSection,
  fetchDeepSuggestions,
  deepResults,
  handleApplyDeep,
  clearDeepResult,
  onRequestJobDescription,
}: EditorSectionContentProps) {
  const navigate = useNavigate();
  const { t } = useLocale();

  // First-visit onboarding banner — shown only on blank resumes, dismissed via localStorage
  const [bannerDismissed, setBannerDismissed] = useState(
    () => !!localStorage.getItem(ONBOARDING_HINT_KEY)
  );
  const showOnboardingBanner =
    !bannerDismissed && activeTab === 'contact' && sectionScores.contact === 0;

  const handleDismissBanner = () => {
    localStorage.setItem(ONBOARDING_HINT_KEY, 'true');
    setBannerDismissed(true);
  };

  return (
    <>
      {/* First-visit onboarding banner — visible on blank new resumes only */}
      {showOnboardingBanner && (
        <div className="flex items-start gap-3 px-4 py-3 mb-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-foreground/80" style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <span className="text-base leading-none mt-0.5">👋</span>
          <p className="flex-1 leading-snug">
            <span className="font-medium text-foreground">{t('editor.onboarding.welcome', 'Welcome!')}</span> {t('editor.onboarding.fillSectionsSteps', 'Fill in each section using the steps above — changes save automatically.')}
          </p>
          <button
            onClick={handleDismissBanner}
            aria-label={t('editor.onboarding.dismissHint', 'Dismiss hint')}
            className="shrink-0 p-1 rounded-md hover:bg-primary/10 active:scale-95 transition-transform touch-manipulation"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {activeTab === 'contact' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={User} title={t('editor.sections.contactInfo', 'Contact Information')} tip={t('editor.contact.sectionTip', 'Add your name, email, phone and LinkedIn — these appear at the top of your resume')} status={getSectionStatus(sectionScores.contact)} action={<SectionAIAction section="contact" />}>
            <Suspense fallback={<ContactSectionSkeleton />}><ContactSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'summary' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={AlignLeft} title={t('editor.sections.professionalSummary', 'Professional Summary')} tip={t('editor.summary.sectionTip', "Write 2–4 sentences about your experience and what you're looking for")} status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
            <Suspense fallback={<SummarySectionSkeleton />}><SummarySection /></Suspense>
            <ATSInlineSuggestions section="summary" suggestions={getATSSuggestions('summary')} isAnalyzing={isAnalyzingSection('summary')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['summary']} onApplyDeep={(improved) => handleApplyDeep('summary', improved)} onDiscardDeep={() => clearDeepResult('summary')} hasJobDescription={!!jobDescription?.trim()} onRequestJobDescription={onRequestJobDescription} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'experience' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Briefcase} title={t('editor.sections.workExperience', 'Work Experience')} tip={t('editor.experience.sectionTip', 'Add your most recent job first — tap an entry to expand and edit it')} status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
            <Suspense fallback={<ExperienceSectionSkeleton />}><ExperienceSection /></Suspense>
            <ATSInlineSuggestions section="experience" suggestions={getATSSuggestions('experience')} isAnalyzing={isAnalyzingSection('experience')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['experience']} onApplyDeep={(improved) => handleApplyDeep('experience', improved)} onDiscardDeep={() => clearDeepResult('experience')} hasJobDescription={!!jobDescription?.trim()} onRequestJobDescription={onRequestJobDescription} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'education' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={GraduationCap} title={t('editor.sections.educationTitle', 'Education')} tip={t('editor.education.sectionTip', 'List your highest degree first — GPA is optional')} status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
            <Suspense fallback={<EducationSectionSkeleton />}><EducationSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="education" suggestions={getATSSuggestions('education')} isAnalyzing={isAnalyzingSection('education')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['education']} onApplyDeep={(improved) => handleApplyDeep('education', improved)} onDiscardDeep={() => clearDeepResult('education')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'skills' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Wrench} title={t('editor.sections.skillsTitle', 'Skills')} tip={t('editor.skills.sectionTip', "Add 6–10 skills matching the jobs you're applying to")} status={getSectionStatus(sectionScores.skills)} action={<SectionAIAction section="skills" />}>
            <Suspense fallback={<SkillsSectionSkeleton />}><SkillsSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="skills" suggestions={getATSSuggestions('skills')} isAnalyzing={isAnalyzingSection('skills')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['skills']} onApplyDeep={(improved) => handleApplyDeep('skills', improved)} onDiscardDeep={() => clearDeepResult('skills')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'certifications' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Award} title={t('editor.sections.certificationsTitle', 'Certifications')} action={<SectionAIAction section="certifications" />}>
            <Suspense fallback={<ListSectionSkeleton />}><CertificationsSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'languages' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Globe} title={t('editor.sections.languagesTitle', 'Languages')} action={<SectionAIAction section="languages" />}>
            <Suspense fallback={<ListSectionSkeleton />}><LanguagesSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'awards' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Trophy} title={t('editor.sections.awardsTitle', 'Awards & Achievements')} action={<SectionAIAction section="awards" />}>
            <Suspense fallback={<ListSectionSkeleton />}><AwardsSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'publications' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={BookOpen} title={t('editor.sections.publicationsTitle', 'Publications')} action={<SectionAIAction section="publications" />}>
            <Suspense fallback={<ListSectionSkeleton />}><PublicationsSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'volunteering' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Heart} title={t('editor.sections.volunteeringTitle', 'Volunteering')} action={<SectionAIAction section="volunteering" />}>
            <Suspense fallback={<ListSectionSkeleton />}><VolunteeringSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'projects' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Rocket} title={t('editor.sections.projectsTitle', 'Projects')} action={<SectionAIAction section="projects" />}>
            <Suspense fallback={<ListSectionSkeleton />}><ProjectsSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'hobbies' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Palette} title={t('editor.sections.hobbiesTitle', 'Hobbies & Interests')}>
            <Suspense fallback={<ListSectionSkeleton />}><HobbiesSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'references' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Users} title={t('editor.sections.referencesTitle', 'References')}>
            <Suspense fallback={<ListSectionSkeleton />}><ReferencesSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'more' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          {!moreSubSection ? (
            <SectionCard icon={Plus} title={t('editor.sections.moreSections', 'More Sections')}>
              <AddSectionSheet onSelectSection={(s) => setMoreSubSection(s)} />
            </SectionCard>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setMoreSubSection(null)} className="text-sm text-primary flex items-center gap-1 active:scale-95 touch-manipulation min-h-[44px]">
                <ChevronLeft className="w-4 h-4" /> {t('editor.sections.allSections', 'All Sections')}
              </button>
              <Suspense fallback={<ListSectionSkeleton />}>
                {(() => {
                  const config = MORE_SECTION_COMPONENTS[moreSubSection!];
                  if (!config) {
                    setMoreSubSection(null);
                    return null;
                  }
                  const { icon, titleKey, defaultTitle, hasAI, Component } = config;
                  return (
                    <SectionCard icon={icon} title={t(titleKey, defaultTitle)} action={hasAI ? <SectionAIAction section={moreSubSection! as SectionType} /> : undefined}>
                      <Component />
                    </SectionCard>
                  );
                })()}
              </Suspense>
            </div>
          )}
        </div>
      )}

    </>
  );
}

export function SectionNavButtons({
  steps,
  activeTab,
  handleTabChange,
  navigate,
  noPadding = false,
}: {
  steps: { id: string; label: string }[];
  activeTab: string;
  handleTabChange: (tab: string) => void;
  navigate: ReturnType<typeof useNavigate>;
  noPadding?: boolean;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const { t } = useLocale();

  return (
    <div className={cn('flex flex-row items-center gap-2 overflow-hidden flex-1', !noPadding && 'py-3')}>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 min-w-0 min-h-[44px] text-xs px-2.5"
        onClick={() => {
          haptics.light();
          const currentIndex = steps.findIndex(s => s.id === activeTab);
          if (currentIndex > 0) handleTabChange(steps[currentIndex - 1].id);
        }}
        disabled={activeTab === steps[0].id}
      >
        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
        {t('editor.nav.prev', 'Prev')}
      </Button>
      {activeTab === steps[steps.length - 1].id ? (
        <Button
          size="sm"
          className="flex-1 min-w-0 min-h-[44px] text-xs px-2.5 font-semibold shadow-soft-sm"
          disabled={isNavigating}
          onClick={() => {
            if (isNavigating) return;
            setIsNavigating(true);
            haptics.success();
            navigate('/preview');
          }}
        >
          {isNavigating ? (
            <MiniSpinner size={12} className="mr-1" />
          ) : (
            <Eye className="w-3.5 h-3.5 mr-1" />
          )}
          {isNavigating ? t('editor.nav.loading', 'Loading…') : t('editor.nav.preview', 'Preview')}
        </Button>
      ) : (
        <Button
          size="sm"
          className="flex-1 min-w-0 min-h-[44px] text-xs px-2.5"
          onClick={() => {
            haptics.medium();
            const currentIndex = steps.findIndex(s => s.id === activeTab);
            if (currentIndex < steps.length - 1) handleTabChange(steps[currentIndex + 1].id);
          }}
        >
          {t('editor.nav.next', 'Next')}
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}
