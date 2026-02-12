import { motion } from 'framer-motion';
import { Plus, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkillSuggestion } from '@/types/resume';
import { cn } from '@/lib/utils';

interface SkillSuggestionListProps {
  missingSkills: SkillSuggestion[];
  boostableSkills: SkillSuggestion[];
  onAddSkill: (skill: string) => void;
  onBoostSkill: (skill: string) => void;
  onAddAll: () => void;
}

export function SkillSuggestionList({
  missingSkills,
  boostableSkills,
  onAddSkill,
  onBoostSkill,
  onAddAll,
}: SkillSuggestionListProps) {
  const hasAny = missingSkills.length > 0 || boostableSkills.length > 0;

  if (!hasAny) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h4 className="font-semibold text-sm">Skills Gap Analysis</h4>
      </div>

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Required by job but missing from resume:
          </p>
          <div className="space-y-2">
            {missingSkills.map((suggestion, index) => (
              <motion.div
                key={suggestion.skill}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-2 shrink-0 bg-success/10 text-success border-success/30 hover:bg-success/20"
                    onClick={() => onAddSkill(suggestion.skill)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                  <span className="font-medium text-sm truncate">{suggestion.skill}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {suggestion.frequency}x in job
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Boostable Skills */}
      {boostableSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-3">
            You have these but not emphasized:
          </p>
          <div className="space-y-2">
            {boostableSkills.map((suggestion, index) => (
              <motion.div
                key={suggestion.skill}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (missingSkills.length + index) * 0.05 }}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/50 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-2 shrink-0 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    onClick={() => onBoostSkill(suggestion.skill)}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Boost
                  </Button>
                  <span className="font-medium text-sm truncate">{suggestion.skill}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{suggestion.reason}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Add All Button */}
      {missingSkills.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddAll}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add All Suggested Skills ({missingSkills.length})
        </Button>
      )}
    </motion.div>
  );
}
