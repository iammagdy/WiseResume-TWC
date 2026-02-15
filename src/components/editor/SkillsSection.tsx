import { useState, memo, useRef } from 'react';

import { Plus, X, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { toast } from 'sonner';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';
import { SectionEmptyState } from './SectionEmptyState';
import { skillsExample } from '@/lib/emptyStateExamples';

export const SkillsSection = memo(function SkillsSection() {
  const skills = useResumeStore(state => state.currentResume?.skills);
  const gapAnalysis = useResumeStore(state => state.gapAnalysis);
  const jobDescription = useResumeStore(state => state.jobDescription);
  const updateResume = useResumeStore(state => state.updateResume);
  const currentResume = useResumeStore(state => state.currentResume);
  const [newSkill, setNewSkill] = useState('');
  
  const { enhance, isEnhancing } = useAIEnhance({
    section: 'skills',
    onApply: (content) => {
      const updatedSkills = content as string[];
      if (Array.isArray(updatedSkills)) {
        updateResume({ skills: updatedSkills });
        toast.success('Skills updated!');
      }
    },
  });

  const hasMissingSkills = gapAnalysis && gapAnalysis.missingSkills.length > 0;
  
  const { getNudgeForSection, dismissNudge } = useResumeNudges({
    resume: currentResume,
    jobDescription,
    hasMissingSkills,
  });

  if (!currentResume || !skills) return null;

  const nudge = getNudgeForSection('skills');

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (skills.includes(newSkill.trim())) return;

    updateResume({
      skills: [...skills, newSkill.trim()],
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
      skills: [...skills, skill],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleAIAction = async (actionId: string) => {
    const result = await enhance(
      actionId as ActionType,
      skills,
      currentResume
    );
    
    if (result?.improved) {
      const updatedSkills = result.improved as string[];
      if (Array.isArray(updatedSkills)) {
        updateResume({ skills: updatedSkills });
        toast.success(`${result.changes?.join(', ') || 'Skills enhanced!'}`);
      }
    }
  };

  const handleNudgeAction = () => {
    if (nudge) {
      handleAIAction(nudge.action);
      dismissNudge(nudge.trigger);
    }
  };

  return (
    <div className="space-y-4">
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
          className="h-12 text-base"
        />
        <Button onClick={addSkill} className="h-12 min-h-[48px] px-6">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Current skills */}
      <div className="flex flex-wrap gap-2 overflow-hidden">
        {skills.map((skill) => (
            <div key={skill} className="transition-all duration-200">
              <Badge
                variant="secondary"
                className="min-h-[44px] px-3 sm:px-4 gap-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors touch-manipulation active:scale-95 text-sm"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <span className="inline-flex items-center justify-center min-w-[32px] min-h-[32px]">
                  <X className="w-4 h-4" />
                </span>
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
            { label: 'AI Suggest Skills', variant: 'default', icon: Sparkles, onClick: () => handleAIAction('generate') },
          ]}
        />
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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {gapAnalysis.missingSkills
              .filter((skill) => !skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="min-h-[44px] px-4 gap-2 cursor-pointer border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors touch-manipulation active:scale-95 text-sm"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus className="w-4 h-4" />
                  {skill}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Quick add common skills */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h4 className="font-semibold text-sm mb-3">Common Skills</h4>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Git', 'Agile', 'Leadership', 'Communication']
            .filter((skill) => !skills.includes(skill))
            .slice(0, 6)
            .map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="min-h-[44px] px-3 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation active:scale-95"
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
