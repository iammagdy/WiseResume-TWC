import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronUp, 
  ChevronDown, 
  Wand2, 
  Target, 
  FileText, 
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { JobMatchScore } from '@/types/resume';

interface AIAssistantBarProps {
  matchScore?: JobMatchScore | null;
  jobDescription?: string;
  onTailor: () => void;
  onAnalyze: () => void;
  onImprove: () => void;
  onChangeTemplate: () => void;
  className?: string;
}

export function AIAssistantBar({
  matchScore,
  jobDescription,
  onTailor,
  onAnalyze,
  onImprove,
  onChangeTemplate,
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
    <motion.div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-40',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <motion.div
        className="glass rounded-2xl border border-border overflow-hidden"
        layout
        style={{
          boxShadow: '0 -4px 24px -4px hsl(var(--background) / 0.8)',
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
            <span className="font-medium text-sm">AI Assistant</span>
          </div>

          <div className="flex items-center gap-3">
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
                    label="Tailor for Job"
                    onClick={() => handleAction(onTailor)}
                  />
                  <AIActionButton
                    icon={<Target className="w-4 h-4" />}
                    label="Analyze Match"
                    onClick={() => handleAction(onAnalyze)}
                  />
                  <AIActionButton
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Improve Section"
                    onClick={() => handleAction(onImprove)}
                  />
                  <AIActionButton
                    icon={<FileText className="w-4 h-4" />}
                    label="Change Template"
                    onClick={() => handleAction(onChangeTemplate)}
                  />
                </div>

                {/* Tip */}
                {!jobDescription && (
                  <motion.div
                    className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">Pro tip:</span> Paste a job URL or description to get a personalized match score and tailoring suggestions.
                    </p>
                  </motion.div>
                )}

                {/* Current Job Summary */}
                {jobDescription && (
                  <motion.div
                    className="p-3 rounded-xl bg-muted/30 border border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-xs text-muted-foreground mb-1">Target Job</p>
                    <p className="text-sm line-clamp-2">{jobDescription}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

interface AIActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function AIActionButton({ icon, label, onClick }: AIActionButtonProps) {
  return (
    <motion.button
      className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/50 transition-colors touch-manipulation"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
