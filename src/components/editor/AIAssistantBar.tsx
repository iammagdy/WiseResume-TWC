import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { AIEngineBadge } from '@/components/editor/ai/AIEngineBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  onAIDetector?: () => void;
  onLinkedIn?: () => void;
  onOnePage?: () => void;
  onCareerPath?: () => void;
  className?: string;
}

const secondaryTools = [
  { id: 'enhance', icon: Sparkles, label: 'Enhance', color: 'text-cyan-500' },
  { id: 'interview', icon: Mic, label: 'Interview', color: 'text-orange-500' },
  { id: 'career', icon: TrendingUp, label: 'Career', color: 'text-emerald-500' },
  { id: 'humanizer', icon: Shield, label: 'Humanize', color: 'text-violet-500' },
  { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-500' },
  { id: 'onepage', icon: FileText, label: '1-Page', color: 'text-amber-500' },
  { id: 'recruiter', icon: UserCheck, label: 'Recruiter', color: 'text-rose-500' },
];

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
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  const handleToggle = () => {
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action: () => void) => {
    haptics.medium();
    action();
    setIsExpanded(false);
  };

  const handleSecondaryAction = (id: string) => {
    haptics.medium();
    setIsExpanded(false);
    
    switch (id) {
      case 'enhance': onImprove(); break;
      case 'interview': navigate('/interview'); break;
      case 'career': onCareerPath?.(); break;
      case 'humanizer': onAIDetector?.(); break;
      case 'linkedin': onLinkedIn?.(); break;
      case 'onepage': onOnePage?.(); break;
      case 'recruiter': onRecruiterSim?.(); break;
    }
  };

  const availableSecondaryTools = secondaryTools.filter(tool => {
    switch (tool.id) {
      case 'career': return !!onCareerPath;
      case 'humanizer': return !!onAIDetector;
      case 'linkedin': return !!onLinkedIn;
      case 'onepage': return !!onOnePage;
      case 'recruiter': return !!onRecruiterSim;
      default: return true;
    }
  });

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
    <div className={cn('mx-4 mb-2', className)}>
      <div
        className="glass-elevated rounded-2xl overflow-hidden"
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

            <div
              className="transition-transform duration-200"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="px-4 pb-4 space-y-4">
              <AIEngineBadge showSettingsLink />

              <div className="grid grid-cols-2 gap-3">
                <PrimaryActionButton
                  icon={<Wand2 className="w-5 h-5" />}
                  label="Tailor"
                  description="Adapt to job"
                  onClick={() => handleAction(onTailor)}
                  colorClass="text-primary"
                  bgClass="bg-primary/10"
                />
                <PrimaryActionButton
                  icon={<Target className="w-5 h-5" />}
                  label="Analyze"
                  description="Check ATS fit"
                  onClick={() => handleAction(onAnalyze)}
                  colorClass="text-primary"
                  bgClass="bg-primary/10"
                />
              </div>

              <Collapsible open={moreToolsOpen} onOpenChange={setMoreToolsOpen}>
                <CollapsibleTrigger asChild>
                  <button 
                    className="w-full flex items-center justify-between py-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                    onClick={() => haptics.light()}
                  >
                    <span className="font-medium">More AI Tools</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground/70">{availableSecondaryTools.length} tools</span>
                      <div
                        className="transition-transform duration-200"
                        style={{ transform: moreToolsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {availableSecondaryTools.map((tool) => (
                      <SecondaryToolButton
                        key={tool.id}
                        icon={<tool.icon className={cn("w-5 h-5", tool.color)} />}
                        label={tool.label}
                        onClick={() => handleSecondaryAction(tool.id)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {!jobDescription && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Pro tip:</span> Paste a job URL or description to get a personalized match score and tailoring suggestions.
                  </p>
                </div>
              )}

              {jobDescription && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Target Job</p>
                  <p className="text-sm line-clamp-2">{jobDescription}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface PrimaryActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  colorClass: string;
  bgClass: string;
}

const PrimaryActionButton = memo(function PrimaryActionButton({
  icon, label, description, onClick, colorClass, bgClass,
}: PrimaryActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl glass-elevated border border-transparent hover:border-primary/30 active:scale-[0.97] transition-all touch-manipulation"
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", bgClass)}>
        <span className={colorClass}>{icon}</span>
      </div>
      <div className="text-center">
        <span className="font-medium text-sm block">{label}</span>
        <span className="text-[11px] text-muted-foreground">{description}</span>
      </div>
    </button>
  );
});

interface SecondaryToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const SecondaryToolButton = memo(function SecondaryToolButton({
  icon, label, onClick,
}: SecondaryToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-transparent hover:bg-muted/50 active:scale-95 transition-all touch-manipulation"
    >
      <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </button>
  );
});
