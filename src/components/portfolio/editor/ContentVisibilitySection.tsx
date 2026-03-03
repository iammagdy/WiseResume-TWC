import React from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard, SubSectionHeading } from './shared';

export interface PortfolioSections {
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  awards: boolean;
  publications: boolean;
  volunteering: boolean;
  githubProjects: boolean;
}

export const DEFAULT_SECTIONS: PortfolioSections = {
  experience: true, education: true, skills: true, projects: true,
  certifications: true, awards: true, publications: true, volunteering: true,
  githubProjects: true,
};

export const SECTION_LABELS: Record<keyof PortfolioSections, string> = {
  experience: 'Experience', education: 'Education', skills: 'Skills',
  projects: 'Projects', certifications: 'Certifications', awards: 'Awards',
  publications: 'Publications', volunteering: 'Volunteering', githubProjects: 'GitHub Projects',
};

export interface ContentVisibilitySectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  sections: PortfolioSections;
  onToggleSectionVisibility: (key: keyof PortfolioSections) => void;
  syncMode: 'auto' | 'locked';
  onSyncModeChange: (val: 'auto' | 'locked') => void;
}

export function ContentVisibilitySection(props: ContentVisibilitySectionProps) {
  const {
    openSections, toggleSection, sections, onToggleSectionVisibility,
    syncMode, onSyncModeChange,
  } = props;

  return (
    <CollapsibleCard
      id="content"
      icon={<Eye className="w-4 h-4" />}
      title="Content & Visibility"
      hint={<span>{Object.values(sections).filter(Boolean).length} of {Object.keys(sections).length} shown</span>}
      openSections={openSections}
      toggleSection={toggleSection}
    >
      {/* Section toggles */}
      <p className="text-xs text-muted-foreground">Choose which sections appear on your public portfolio.</p>
      <div className="space-y-2">
        {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
            <Switch checked={sections[key]} onCheckedChange={() => onToggleSectionVisibility(key)} />
          </div>
        ))}
      </div>

      {/* Sync Mode */}
      <SubSectionHeading icon={<Sparkles className="w-3.5 h-3.5" />} label="Content Sync Mode" />
      <p className="text-xs text-muted-foreground mb-2">Control how your portfolio content stays in sync with your resume.</p>
      <div className="space-y-2">
        <button onClick={() => onSyncModeChange('auto')} className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${syncMode === 'auto' ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}>
          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${syncMode === 'auto' ? 'border-primary' : 'border-muted-foreground'}`}>
            {syncMode === 'auto' && <div className="w-2 h-2 rounded-full bg-primary" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Auto-sync</p>
            <p className="text-xs text-muted-foreground">Changes to your resumes automatically sync to this portfolio.</p>
          </div>
        </button>
        <button onClick={() => onSyncModeChange('locked')} className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${syncMode === 'locked' ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}>
          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${syncMode === 'locked' ? 'border-primary' : 'border-muted-foreground'}`}>
            {syncMode === 'locked' && <div className="w-2 h-2 rounded-full bg-primary" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Locked snapshot</p>
            <p className="text-xs text-muted-foreground">Freeze your portfolio at this version — edits to your resume won't affect it</p>
          </div>
        </button>
      </div>
    </CollapsibleCard>
  );
}
