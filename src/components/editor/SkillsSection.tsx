import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Zap, Wand2, Layers, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useResumeStore } from '@/store/resumeStore';
import { useAIEnhance, ActionType } from '@/hooks/useAIEnhance';
import { toast } from 'sonner';
import { InlineAIButton } from './InlineAIButton';
import { AIContextualNudge } from './AIContextualNudge';
import { useResumeNudges } from '@/hooks/useResumeNudges';

export function SkillsSection() {
  const { currentResume, updateResume, gapAnalysis, jobDescription } = useResumeStore();
  const [newSkill, setNewSkill] = useState('');
  
  const { enhance, isEnhancing, currentAction } = useAIEnhance({
    section: 'skills',
    onApply: (content) => {
      const skills = content as string[];
      if (Array.isArray(skills)) {
        updateResume({ skills });
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

  if (!currentResume) return null;

  const nudge = getNudgeForSection('skills');

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (currentResume.skills.includes(newSkill.trim())) return;

    updateResume({
      skills: [...currentResume.skills, newSkill.trim()],
    });
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    updateResume({
      skills: currentResume.skills.filter((s) => s !== skill),
    });
  };

  const addSuggestedSkill = (skill: string) => {
    if (currentResume.skills.includes(skill)) return;
    updateResume({
      skills: [...currentResume.skills, skill],
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
      currentResume.skills,
      currentResume
    );
    
    if (result?.improved) {
      const skills = result.improved as string[];
      if (Array.isArray(skills)) {
        updateResume({ skills });
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
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Skills</h3>
        <InlineAIButton
          section="skills"
          onAction={handleAIAction}
          isLoading={isEnhancing}
        />
      </div>

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
          className="h-12"
        />
        <Button onClick={addSkill} className="h-12 px-6">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Current skills */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {currentResume.skills.map((skill) => (
            <motion.div
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <Badge
                variant="secondary"
                className="h-10 px-4 gap-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors touch-manipulation active:scale-95 text-sm"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="w-4 h-4" />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {currentResume.skills.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No skills added yet. Start typing to add skills.
        </p>
      )}

      {/* Suggested skills from gap analysis */}
      {gapAnalysis && gapAnalysis.missingSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-secondary/10 border border-secondary/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-secondary" />
            <h4 className="font-semibold text-sm">Suggested Skills</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Based on your target job description:
          </p>
          <div className="flex flex-wrap gap-2">
            {gapAnalysis.missingSkills
              .filter((skill) => !currentResume.skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="h-10 px-4 gap-2 cursor-pointer border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors touch-manipulation active:scale-95 text-sm"
                  onClick={() => addSuggestedSkill(skill)}
                >
                  <Plus className="w-4 h-4" />
                  {skill}
                </Badge>
              ))}
          </div>
        </motion.div>
      )}

      {/* Quick add common skills */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h4 className="font-semibold text-sm mb-3">Common Skills</h4>
        <div className="flex flex-wrap gap-2">
          {['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Git', 'Agile', 'Leadership', 'Communication']
            .filter((skill) => !currentResume.skills.includes(skill))
            .slice(0, 6)
            .map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="h-9 px-3 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation active:scale-95"
                onClick={() => addSuggestedSkill(skill)}
              >
                + {skill}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
