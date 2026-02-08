import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronUp, 
  Wand2, 
  Target, 
  Lightbulb,
  TrendingUp,
  Palette,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { JobMatchScore, TemplateId } from '@/types/resume';

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  modern: 'Modern',
  classic: 'Classic',
  minimal: 'Minimal',
  professional: 'Professional',
  developer: 'Developer',
  creative: 'Creative',
  executive: 'Executive',
  compact: 'Compact',
  academic: 'Academic',
  healthcare: 'Healthcare',
  sales: 'Sales',
  elegant: 'Elegant',
};

interface AIAssistantBarProps {
  matchScore?: JobMatchScore | null;
  jobDescription?: string;
  currentTemplate: TemplateId;
  onChangeTemplate: () => void;
  onTailor: () => void;
  onAnalyze: () => void;
  onImprove: () => void;
  onRecruiterSim?: () => void;
  className?: string;
}

export const AIAssistantBar = memo(function AIAssistantBar({
  matchScore,
  jobDescription,
  currentTemplate,
  onChangeTemplate,
  onTailor,
  onAnalyze,
  onImprove,
  onRecruiterSim,
  className,
}: AIAssistantBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action: () => void) => {
    haptics.medium();
    action();
    setIsExpanded(false);
  };

  const scoreColor = matchScore
    ? matchScore.overallScore >= 70
      ? 'text-success'
      : matchScore.overallScore >= 40
      ? 'text-warning'
      : 'text-destructive'
    : 'text-muted-foreground';

  const scoreBg = matchScore
    ? matchScore.overallScore >= 70
      ? 'bg-success/10 border-success/30'
      : matchScore.overallScore >= 40
      ? 'bg-warning/10 border-warning/30'
      : 'bg-destructive/10 border-destructive/30'
    : 'bg-muted/50';

  return (
    <div
      className={cn(
        'mx-4 mb-2',
        className
      )}
    >
      <motion.div
        className="glass-elevated rounded-2xl overflow-hidden"
        layout
        style={{
          boxShadow: '0 -4px 32px -4px hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--border) / 0.2)',
        }}
      >
        {/* Collapsed Bar */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between p-4 touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-sm">AI Studio</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Chip */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.light();
                onChangeTemplate();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg glass-surface hover:border-primary/30 text-xs text-muted-foreground transition-all touch-manipulation"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="max-w-[60px] truncate">{TEMPLATE_NAMES[currentTemplate]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Match Score Badge */}
            {matchScore ? (
              <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-semibold', scoreBg, scoreColor)}>
                <TrendingUp className="w-3.5 h-3.5" />
                {matchScore.overallScore}%
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {jobDescription ? 'Analyzing...' : 'No job set'}
              </span>
            )}

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Action Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <AIActionButton
                    icon={<Wand2 className="w-4 h-4" />}
                    label="Smart Tailor"
                    onClick={() => handleAction(onTailor)}
                  />
                  <AIActionButton
                    icon={<Target className="w-4 h-4" />}
                    label="Job Match"
                    onClick={() => handleAction(onAnalyze)}
                  />
                  <AIActionButton
                    icon={<Sparkles className="w-4 h-4" />}
                    label="AI Enhance"
                    onClick={() => handleAction(onImprove)}
                  />
                  {onRecruiterSim && (
                    <AIActionButton
                      icon={<UserCheck className="w-4 h-4" />}
                      label="Recruiter Sim"
                      onClick={() => handleAction(onRecruiterSim)}
                      badge="New"
                    />
                  )}
                </div>

                {/* Tip */}
                {!jobDescription && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">Pro tip:</span> Paste a job URL or description to get a personalized match score and tailoring suggestions.
                    </p>
                  </div>
                )}

                {/* Current Job Summary */}
                {jobDescription && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Target Job</p>
                    <p className="text-sm line-clamp-2">{jobDescription}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

interface AIActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string;
}

const AIActionButton = memo(function AIActionButton({ icon, label, onClick, badge }: AIActionButtonProps) {
  return (
    <button
      className="relative flex items-center gap-2 p-3 rounded-xl glass-elevated border-glow transition-all touch-manipulation active:scale-[0.97]"
      onClick={onClick}
    >
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium shadow-[0_0_8px_hsl(var(--primary)/0.4)]">
          {badge}
        </span>
      )}
      <div className="w-8 h-8 rounded-lg icon-glow flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
});
