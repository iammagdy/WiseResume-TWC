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
  Shield,
  Linkedin,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { AIProviderBadge } from '@/components/editor/ai/AIProviderBadge';
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

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
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
  onAIDetector?: () => void;
  onLinkedIn?: () => void;
  onOnePage?: () => void;
  onCareerPath?: () => void;
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
  onAIDetector,
  onLinkedIn,
  onOnePage,
  onCareerPath,
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
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="px-4 pb-4 space-y-4"
              >
                {/* Provider Badge */}
                <motion.div variants={itemVariants} className="flex items-center justify-center">
                  <AIProviderBadge size="md" showSettingsLink />
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Section: Optimize for Job */}
                <div>
                  <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Optimize for Job
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div variants={itemVariants}>
                      <AIActionButton
                        icon={<Wand2 className="w-4 h-4 text-primary-foreground" />}
                        label="Smart Tailor"
                        description="Auto-adapt to job requirements"
                        onClick={() => handleAction(onTailor)}
                      />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <AIActionButton
                        icon={<Target className="w-4 h-4 text-primary-foreground" />}
                        label="Job Match"
                        description="Check ATS fit score"
                        onClick={() => handleAction(onAnalyze)}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Section: Enhance & Practice */}
                <div>
                  <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Enhance & Practice
                    </span>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div variants={itemVariants}>
                      <AIActionButton
                        icon={<Sparkles className="w-4 h-4 text-primary-foreground" />}
                        label="AI Enhance"
                        description="Improve bullet points"
                        onClick={() => handleAction(onImprove)}
                      />
                    </motion.div>
                    {onRecruiterSim && (
                      <motion.div variants={itemVariants}>
                        <AIActionButton
                          icon={<UserCheck className="w-4 h-4 text-primary-foreground" />}
                          label="Recruiter Sim"
                          description="Mock interview Q&A"
                          onClick={() => handleAction(onRecruiterSim)}
                        />
                      </motion.div>
                    )}
                  </div>
                  {onCareerPath && (
                    <motion.div variants={itemVariants} className="mt-2">
                      <AIActionButton
                        icon={<TrendingUp className="w-4 h-4 text-primary-foreground" />}
                        label="Career Path Advisor"
                        description="Discover your next career move"
                        onClick={() => handleAction(onCareerPath)}
                        badge="New"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Section: Polish & Finalize */}
                {(onAIDetector || onLinkedIn || onOnePage) && (
                  <div>
                    <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Polish & Finalize
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">
                        New
                      </span>
                    </motion.div>
                    <div className="grid grid-cols-3 gap-2">
                      {onAIDetector && (
                        <motion.div variants={itemVariants}>
                          <AIActionButton
                            icon={<Shield className="w-4 h-4 text-primary-foreground" />}
                            label="Humanizer"
                            description="Beat AI detection"
                            onClick={() => handleAction(onAIDetector)}
                            featured
                          />
                        </motion.div>
                      )}
                      {onLinkedIn && (
                        <motion.div variants={itemVariants}>
                          <AIActionButton
                            icon={<Linkedin className="w-4 h-4 text-primary-foreground" />}
                            label="LinkedIn"
                            description="Optimize profile"
                            onClick={() => handleAction(onLinkedIn)}
                            featured
                          />
                        </motion.div>
                      )}
                      {onOnePage && (
                        <motion.div variants={itemVariants}>
                          <AIActionButton
                            icon={<FileText className="w-4 h-4 text-primary-foreground" />}
                            label="1-Page"
                            description="Condense resume"
                            onClick={() => handleAction(onOnePage)}
                            featured
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tip */}
                {!jobDescription && (
                  <motion.div 
                    variants={itemVariants}
                    className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10"
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
                    variants={itemVariants}
                    className="p-3 rounded-xl bg-muted/30 border border-border"
                  >
                    <p className="text-xs text-muted-foreground mb-1">Target Job</p>
                    <p className="text-sm line-clamp-2">{jobDescription}</p>
                  </motion.div>
                )}
              </motion.div>
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
  description?: string;
  onClick: () => void;
  badge?: string;
  featured?: boolean;
}

const AIActionButton = memo(function AIActionButton({ 
  icon, 
  label, 
  description, 
  onClick, 
  badge, 
  featured 
}: AIActionButtonProps) {
  return (
    <button
      className={cn(
        "relative w-full flex items-start gap-3 p-3 rounded-xl text-left",
        "glass-elevated border-glow transition-all touch-manipulation",
        "active:scale-[0.97] hover:bg-primary/5",
        featured && "ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      {badge && (
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">
          {badge}
        </span>
      )}
      <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block">{label}</span>
        {description && (
          <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 block">
            {description}
          </span>
        )}
      </div>
    </button>
  );
});
