import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ArrowUp, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SkillSuggestion } from '@/types/resume';
import { cn } from '@/lib/utils';

interface SmartSkillSuggestionsProps {
  /** Terms found in the job description but not in the candidate's source resume. */
  missingSkills: SkillSuggestion[];
  /** Existing source-resume skills that can safely be moved higher. */
  boostableSkills: SkillSuggestion[];
  onBoostSkill: (skill: string) => void;
}

export function SmartSkillSuggestions({
  missingSkills,
  boostableSkills,
  onBoostSkill,
}: SmartSkillSuggestionsProps) {
  const [boostedSkills, setBoostedSkills] = useState<Set<string>>(new Set());
  const frequentTerms = missingSkills.filter((skill) => skill.frequency >= 3);
  const otherTerms = missingSkills.filter((skill) => skill.frequency < 3);

  const boost = (skill: string) => {
    onBoostSkill(skill);
    setBoostedSkills((current) => new Set([...current, skill]));
  };

  if (missingSkills.length === 0 && boostableSkills.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-success/10 border border-success/30">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          <span className="font-medium">No obvious skill terms are missing from this comparison.</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card border border-border shadow-soft-sm"
    >
      <div className="mb-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Job-description terms to review
        </h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Missing terms are recommendations, not claims about your background. Add one manually only if it truthfully reflects your experience.
        </p>
      </div>

      {frequentTerms.length > 0 && (
        <SkillGroup
          icon={<AlertCircle className="w-4 h-4 text-destructive" />}
          title="Frequently mentioned"
          skills={frequentTerms}
        />
      )}

      {otherTerms.length > 0 && (
        <SkillGroup
          icon={<Sparkles className="w-4 h-4 text-primary" />}
          title="Other terms to verify"
          skills={otherTerms.slice(0, 5)}
          remainder={Math.max(0, otherTerms.length - 5)}
        />
      )}

      {boostableSkills.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ArrowUp className="w-4 h-4 text-success" />
            Already on your resume
          </h5>
          <div className="space-y-2">
            {boostableSkills.map((skill) => {
              const boosted = boostedSkills.has(skill.skill);
              return (
                <div
                  key={skill.skill}
                  className={cn(
                    'p-3 rounded-lg border border-success/25 bg-success/10 flex items-center justify-between gap-3',
                    boosted && 'opacity-60',
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{skill.skill}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.reason}</p>
                  </div>
                  <Button
                    variant={boosted ? 'ghost' : 'secondary'}
                    size="sm"
                    className={cn('shrink-0', boosted && 'text-success')}
                    onClick={() => boost(skill.skill)}
                    disabled={boosted}
                  >
                    {boosted ? <CheckCircle className="w-3 h-3 mr-1" /> : <ArrowUp className="w-3 h-3 mr-1" />}
                    {boosted ? 'Moved' : 'Move up'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SkillGroup({
  icon,
  title,
  skills,
  remainder = 0,
}: {
  icon: React.ReactNode;
  title: string;
  skills: SkillSuggestion[];
  remainder?: number;
}) {
  return (
    <div className="mb-4">
      <h5 className="text-sm font-semibold flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h5>
      <div className="space-y-2">
        {skills.map((skill) => (
          <div key={skill.skill} className="p-3 rounded-lg border border-warning/25 bg-warning/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{skill.skill}</span>
              {skill.frequency > 1 && (
                <Badge variant="outline" className="text-xs">{skill.frequency}x in posting</Badge>
              )}
              <Badge variant="secondary" className="text-[10px] ml-auto">Verify first</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{skill.reason}</p>
          </div>
        ))}
        {remainder > 0 && (
          <p className="text-xs text-muted-foreground text-center py-1">+{remainder} more terms to review</p>
        )}
      </div>
    </div>
  );
}
