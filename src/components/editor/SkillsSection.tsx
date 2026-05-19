import { useState, memo, useMemo } from 'react';

import { Plus, X, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import type { ActionType } from '@/hooks/useAIEnhance';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { SectionEmptyState } from './SectionEmptyState';
import { skillsExample } from '@/lib/emptyStateExamples';
import { useSectionAITrigger } from '@/store/sectionAIBridge';

const SKILL_SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  engineer: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'CI/CD', 'Docker'],
  developer: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'CI/CD', 'Docker'],
  software: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'CI/CD', 'Docker'],
  frontend: ['React', 'TypeScript', 'CSS', 'Tailwind CSS', 'Next.js', 'HTML', 'Figma', 'Responsive Design', 'Performance Optimization', 'Accessibility'],
  backend: ['Node.js', 'Python', 'SQL', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Docker', 'Kubernetes', 'Redis', 'Microservices'],
  fullstack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Docker', 'Git', 'CI/CD', 'AWS', 'Next.js'],
  data: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'TensorFlow', 'Tableau', 'R', 'Spark', 'Data Visualization', 'Statistics'],
  analyst: ['SQL', 'Excel', 'Python', 'Tableau', 'Power BI', 'Data Analysis', 'Statistics', 'Google Analytics', 'JIRA', 'Reporting'],
  manager: ['Leadership', 'Project Management', 'Agile', 'Scrum', 'Stakeholder Management', 'Strategic Planning', 'Budget Management', 'JIRA', 'Communication', 'Team Building'],
  product: ['Product Management', 'Roadmapping', 'Agile', 'User Research', 'A/B Testing', 'JIRA', 'Figma', 'Data Analysis', 'Stakeholder Management', 'OKRs'],
  designer: ['Figma', 'Adobe XD', 'Sketch', 'UI/UX Design', 'Prototyping', 'User Research', 'Design Systems', 'Accessibility', 'Wireframing', 'Illustrator'],
  marketing: ['SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing', 'HubSpot', 'Copywriting', 'A/B Testing', 'Paid Advertising', 'CRM'],
  sales: ['CRM', 'Salesforce', 'Lead Generation', 'Cold Outreach', 'Negotiation', 'Account Management', 'HubSpot', 'Pipeline Management', 'Customer Success', 'Communication'],
  devops: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Ansible', 'Prometheus', 'Git', 'Jenkins'],
  cloud: ['AWS', 'Azure', 'GCP', 'Terraform', 'Docker', 'Kubernetes', 'Serverless', 'CI/CD', 'IaC', 'Security'],
  security: ['Penetration Testing', 'SIEM', 'Vulnerability Assessment', 'Network Security', 'Risk Management', 'Compliance', 'Cloud Security', 'Incident Response', 'CISSP', 'Zero Trust'],
  hr: ['Talent Acquisition', 'HRIS', 'Employee Relations', 'Onboarding', 'Performance Management', 'Compensation', 'Diversity & Inclusion', 'Benefits Administration', 'ATS', 'Labor Law'],
  finance: ['Financial Analysis', 'Excel', 'SQL', 'Budgeting', 'Forecasting', 'GAAP', 'Financial Modeling', 'QuickBooks', 'Power BI', 'Compliance'],
  operations: ['Process Improvement', 'Lean', 'Six Sigma', 'Project Management', 'Supply Chain', 'Excel', 'Data Analysis', 'SOP', 'Vendor Management', 'KPIs'],
};

const COMMON_SKILLS = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Git', 'Agile', 'Leadership', 'Communication'];

function getSuggestionsForResume(jobTitles: string[], existingSkills: string[]): string[] {
  const existing = new Set(existingSkills.map(s => s.toLowerCase()));
  const matched = new Set<string>();

  for (const title of jobTitles) {
    const lower = title.toLowerCase();
    for (const [keyword, skills] of Object.entries(SKILL_SUGGESTIONS_BY_ROLE)) {
      if (lower.includes(keyword)) {
        skills.forEach(s => {
          if (!existing.has(s.toLowerCase())) matched.add(s);
        });
      }
    }
  }

  if (matched.size === 0) {
    COMMON_SKILLS.forEach(s => {
      if (!existing.has(s.toLowerCase())) matched.add(s);
    });
  }

  return Array.from(matched).slice(0, 10);
}

export const SkillsSection = memo(function SkillsSection() {
  const skills = useResumeStore(state => state.currentResume?.skills);
  const gapAnalysis = useResumeStore(state => state.gapAnalysis);
  const jobDescription = useResumeStore(state => state.jobDescription);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [newSkill, setNewSkill] = useState('');

  // Route every Skills AI entry point (empty-state CTA, contextual
  // nudge) through the shared bridge so the user sees the preview
  // popup owned by `SectionAIAction` before any change is written.
  const triggerSkillsAI = useSectionAITrigger('skills');

  const hasMissingSkills = gapAnalysis && gapAnalysis.missingSkills.length > 0;
  
  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
    jobDescription,
    hasMissingSkills: hasMissingSkills ?? undefined,
  });

  const jobTitleSuggestions = useMemo(() => {
    if (!currentResume || !skills) return [];
    const positions = (currentResume.experience || []).map(e => e.position).filter(Boolean);
    return getSuggestionsForResume(positions, skills);
  }, [currentResume, skills]);

  if (!currentResume || !skills) return null;

  const nudge = getNudgeForSection('skills');

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (skills.includes(newSkill.trim())) return;

    updateResume({
      skills: [newSkill.trim(), ...skills],
    });
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    updateResume({
      skills: skills.filter((s) => s !== skill),
    });
  };

  const addSuggestedSkill = (skill: string) => {
    if (skills.includes(skill)) return;
    updateResume({
      skills: [skill, ...skills],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const requestSkillsAI = (action: ActionType): boolean => {
    if (triggerSkillsAI) {
      triggerSkillsAI(action);
      return true;
    }
    // If the bridge isn't registered yet (extremely unlikely — it
    // mounts in the same SectionCard), do nothing rather than spawn
    // a competing dialog or bypass the preview. Caller can decide
    // whether to leave the prompt visible so the user can retry.
    return false;
  };

  const handleNudgeAction = () => {
    if (!nudge) return;
    if (requestSkillsAI(nudge.action as ActionType)) {
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-5">
      {/* Contextual Nudge */}
      <AIContextualNudge
        show={!!nudge}
        message={nudge?.message || ''}
        actionLabel={nudge?.actionLabel || ''}
        onAction={handleNudgeAction}
        onDismiss={() => nudge && dismissNudge(nudge.trigger)}
      />

      {/* Add skill input */}
      <div className="flex gap-2">
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a skill..."
          className="h-10 sm:h-12 text-sm sm:text-base"
        />
        <Button onClick={addSkill} className="h-10 sm:h-12 min-h-[40px] sm:min-h-[48px] px-4 sm:px-6">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* Current skills */}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
            <div key={skill} className="transition-all duration-200 min-h-[36px] flex items-center">
              <Badge
                variant="secondary"
                className="h-8 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors touch-manipulation active:scale-95 text-xs font-medium"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="w-3 h-3 shrink-0" />
              </Badge>
            </div>
          ))}
      </div>

      {skills.length === 0 && (
        <SectionEmptyState
          icon={Zap}
          title="List your key skills"
          exampleContent={
            <div className="text-sm space-y-2">
              {Object.entries({ Technical: skillsExample.technical, 'Soft Skills': skillsExample.soft, Languages: skillsExample.languages }).map(([cat, items]) => (
                <div key={cat}>
                  <p className="font-semibold text-xs">{cat}</p>
                  <p className="text-muted-foreground text-xs">{(items as string[]).join(', ')}</p>
                </div>
              ))}
            </div>
          }
          actions={[
            { label: 'Add Your Skills', variant: 'outline', icon: Plus, onClick: () => { /* focus handled by existing input */ } },
            { label: 'AI Suggest Skills', variant: 'default', icon: Sparkles, onClick: () => requestSkillsAI('generate') },
          ]}
        />
      )}

      {/* AI-powered skill suggestions based on job title / experience */}
      {jobTitleSuggestions.length > 0 && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Suggested for you</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Based on your job titles and experience:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {jobTitleSuggestions.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="h-8 px-2.5 gap-1.5 cursor-pointer border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation active:scale-95 text-xs font-medium"
                onClick={() => addSuggestedSkill(skill)}
              >
                <Plus className="w-3 h-3" />
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested skills from gap analysis */}
      {gapAnalysis && gapAnalysis.missingSkills.length > 0 && (
        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/30 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-secondary" />
            <h4 className="font-semibold text-sm">Suggested Skills</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Based on your target job description:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gapAnalysis.missingSkills
              .filter((skill) => !skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="h-8 px-2.5 gap-1.5 cursor-pointer border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors touch-manipulation active:scale-95 text-xs font-medium"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus className="w-3 h-3" />
                  {skill}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Quick add common skills */}
      <div className="p-4 rounded-xl bg-muted border border-border">
        <h4 className="font-semibold text-sm mb-3">Common Skills</h4>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_SKILLS
            .filter((skill) => !skills.includes(skill))
            .slice(0, 6)
            .map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="h-8 px-2.5 text-xs font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation active:scale-95"
                onClick={() => addSuggestedSkill(skill)}
              >
                + {skill}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
});
