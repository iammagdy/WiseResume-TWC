import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Plus, Trophy, Rocket, Award, BookOpen, Heart, Palette, Globe, Users } from 'lucide-react';
import { User, AlignLeft, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/editor/SectionCard';
import { SectionAIAction } from '@/components/editor/SectionAIAction';
import { ATSInlineSuggestions } from '@/components/editor/ATSInlineSuggestions';
import { AddSectionSheet } from '@/components/editor/AddSectionSheet';
import { getSectionStatus } from '@/lib/resumeCompletionRules';
import { ContactSectionSkeleton, SummarySectionSkeleton, ExperienceSectionSkeleton, EducationSectionSkeleton, SkillsSectionSkeleton, ListSectionSkeleton } from '@/components/editor/SectionSkeletons';
import haptics from '@/lib/haptics';
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

const MORE_SECTION_COMPONENTS: Record<string, { icon: React.FC<{ className?: string }>; title: string; hasAI: boolean; Component: React.LazyExoticComponent<React.ComponentType> }> = {
  awards: { icon: Trophy, title: 'Awards & Achievements', hasAI: true, Component: AwardsSection },
  projects: { icon: Rocket, title: 'Projects', hasAI: true, Component: ProjectsSection },
  certifications: { icon: Award, title: 'Certifications', hasAI: true, Component: CertificationsSection },
  publications: { icon: BookOpen, title: 'Publications', hasAI: true, Component: PublicationsSection },
  volunteering: { icon: Heart, title: 'Volunteering', hasAI: true, Component: VolunteeringSection },
  languages: { icon: Globe, title: 'Languages', hasAI: true, Component: LanguagesSection },
  hobbies: { icon: Palette, title: 'Hobbies & Interests', hasAI: false, Component: HobbiesSection },
  references: { icon: Users, title: 'References', hasAI: false, Component: ReferencesSection },
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
  handleApplyDeep: (section: string, improved: unknown) => void;
  clearDeepResult: (section: SectionId) => void;
}

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
}: EditorSectionContentProps) {
  const navigate = useNavigate();

  return (
    <>
      {activeTab === 'contact' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={User} title="Contact Information" tip="Include a professional email and phone number" status={getSectionStatus(sectionScores.contact)} action={<SectionAIAction section="contact" />}>
            <Suspense fallback={<ContactSectionSkeleton />}><ContactSection /></Suspense>
          </SectionCard>
        </div>
      )}
      {activeTab === 'summary' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={AlignLeft} title="Professional Summary" tip="Write 2-4 sentences highlighting your key strengths" status={getSectionStatus(sectionScores.summary)} action={<SectionAIAction section="summary" />}>
            <Suspense fallback={<SummarySectionSkeleton />}><SummarySection /></Suspense>
            <ATSInlineSuggestions section="summary" suggestions={getATSSuggestions('summary')} isAnalyzing={isAnalyzingSection('summary')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['summary']} onApplyDeep={(improved) => handleApplyDeep('summary', improved)} onDiscardDeep={() => clearDeepResult('summary')} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'experience' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Briefcase} title="Work Experience" tip="Include 2-3 key achievements with metrics" status={getSectionStatus(sectionScores.experience)} action={<SectionAIAction section="experience" />}>
            <Suspense fallback={<ExperienceSectionSkeleton />}><ExperienceSection /></Suspense>
            <ATSInlineSuggestions section="experience" suggestions={getATSSuggestions('experience')} isAnalyzing={isAnalyzingSection('experience')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['experience']} onApplyDeep={(improved) => handleApplyDeep('experience', improved)} onDiscardDeep={() => clearDeepResult('experience')} />
          </SectionCard>
        </div>
      )}
      {activeTab === 'education' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={GraduationCap} title="Education" tip="List your most relevant degrees and certifications" status={getSectionStatus(sectionScores.education)} action={<SectionAIAction section="education" />}>
            <Suspense fallback={<EducationSectionSkeleton />}><EducationSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="education" suggestions={getATSSuggestions('education')} isAnalyzing={isAnalyzingSection('education')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['education']} onApplyDeep={(improved) => handleApplyDeep('education', improved)} onDiscardDeep={() => clearDeepResult('education')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'skills' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          <SectionCard icon={Wrench} title="Skills" tip="Add at least 5 relevant skills for ATS optimization" status={getSectionStatus(sectionScores.skills)} action={<SectionAIAction section="skills" />}>
            <Suspense fallback={<SkillsSectionSkeleton />}><SkillsSection /></Suspense>
            {jobDescription && <ATSInlineSuggestions section="skills" suggestions={getATSSuggestions('skills')} isAnalyzing={isAnalyzingSection('skills')} onDeepAnalyze={fetchDeepSuggestions} deepResult={deepResults['skills']} onApplyDeep={(improved) => handleApplyDeep('skills', improved)} onDiscardDeep={() => clearDeepResult('skills')} />}
          </SectionCard>
        </div>
      )}
      {activeTab === 'more' && (
        <div style={{ animation: 'spring-enter 0.35s ease-out' }}>
          {!moreSubSection ? (
            <SectionCard icon={Plus} title="More Sections" tip="Add optional sections to stand out">
              <AddSectionSheet onSelectSection={(s) => setMoreSubSection(s)} />
            </SectionCard>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setMoreSubSection(null)} className="text-sm text-primary flex items-center gap-1 active:scale-95 touch-manipulation min-h-[44px]">
                <ChevronLeft className="w-4 h-4" /> All Sections
              </button>
              <Suspense fallback={<ListSectionSkeleton />}>
                {(() => {
                  const config = MORE_SECTION_COMPONENTS[moreSubSection!];
                  if (!config) {
                    setMoreSubSection(null);
                    return null;
                  }
                  const { icon, title, hasAI, Component } = config;
                  return (
                    <SectionCard icon={icon} title={title} action={hasAI ? <SectionAIAction section={moreSubSection! as any} /> : undefined}>
                      <Component />
                    </SectionCard>
                  );
                })()}
              </Suspense>
            </div>
          )}
        </div>
      )}

      {/* Spacer to push nav buttons to bottom of visible scroll area */}
      <div className="flex-1" />

      {/* Section Navigation — pinned to bottom */}
      <div className="flex flex-row items-center gap-2 sm:gap-3 pt-3 pb-4 overflow-hidden">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 min-h-[48px]"
          onClick={() => {
            haptics.light();
            const currentIndex = steps.findIndex(s => s.id === activeTab);
            if (currentIndex > 0) handleTabChange(steps[currentIndex - 1].id);
          }}
          disabled={activeTab === steps[0].id}
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>
        {activeTab === steps[steps.length - 1].id ? (
          <Button
            size="lg"
            className="flex-1 min-w-0 min-h-[48px] text-sm gradient-primary shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)]"
            onClick={() => {
              haptics.success();
              navigate('/preview');
            }}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Preview & Export
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 min-w-0 min-h-[48px]"
            onClick={() => {
              haptics.medium();
              const currentIndex = steps.findIndex(s => s.id === activeTab);
              if (currentIndex < steps.length - 1) handleTabChange(steps[currentIndex + 1].id);
            }}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </>
  );
}
