import { motion } from 'framer-motion';
import { 
  Wand2, 
  Target, 
  Sparkles, 
  TrendingUp, 
  BarChart3,
  UserCheck,
  Palette,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobMatchScore } from '@/types/resume';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import { AICostBadge } from '@/components/ai/AICostBadge';

interface AIActionTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  onClick: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function AIActionTile({ icon, title, subtitle, onClick, badge, badgeVariant = 'secondary' }: AIActionTileProps) {
  return (
    <motion.button
      className="flex flex-col items-center justify-center p-4 rounded-2xl glass-elevated border-glow hover:scale-[1.02] transition-all touch-manipulation min-h-[100px] relative"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {badge && (
        <Badge 
          variant={badgeVariant} 
          className="absolute -top-2 -right-2 text-[10px] px-1.5"
        >
          {badge}
        </Badge>
      )}
      <div className="w-10 h-10 rounded-xl icon-glow flex items-center justify-center mb-2">
        {icon}
      </div>
      <span className="font-medium text-sm text-center">{title}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground mt-0.5 text-center">{subtitle}</span>
      )}
    </motion.button>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <span className="w-8 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground/70 mt-0.5 pl-10">{subtitle}</p>
      )}
    </div>
  );
}

interface AIHubSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchScore?: JobMatchScore | null;
  jobDescription?: string;
  activeTab?: string;
  onTailor: () => void;
  onAnalyze: () => void;
  onImproveSection: () => void;
  onChangeTemplate: () => void;
  onViewComparison?: () => void;
  onRecruiterSim?: () => void;
  onTemplateAdvisor?: () => void;
}

export function AIHubSheet({
  open,
  onOpenChange,
  matchScore,
  jobDescription,
  activeTab,
  onTailor,
  onAnalyze,
  onImproveSection,
  onChangeTemplate,
  onViewComparison,
  onRecruiterSim,
}: AIHubSheetProps) {
  const { currentComparison } = useResumeStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Studio
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {/* Match Score Display */}
          {matchScore && (
            <motion.div
              className={cn(
                'p-4 rounded-2xl mb-4 flex items-center gap-4',
                matchScore.overallScore >= 70 && 'bg-success/10 border border-success/30',
                matchScore.overallScore >= 40 && matchScore.overallScore < 70 && 'bg-warning/10 border border-warning/30',
                matchScore.overallScore < 40 && 'bg-destructive/10 border border-destructive/30'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl',
                  matchScore.overallScore >= 70 && 'bg-success/20 text-success',
                  matchScore.overallScore >= 40 && matchScore.overallScore < 70 && 'bg-warning/20 text-warning',
                  matchScore.overallScore < 40 && 'bg-destructive/20 text-destructive'
                )}
              >
                {matchScore.overallScore}
              </div>
              <div className="flex-1">
                <p className="font-semibold">Match Score</p>
                <p className="text-sm text-muted-foreground">
                  {matchScore.overallScore >= 70
                    ? 'Great match for this job!'
                    : matchScore.overallScore >= 40
                    ? 'Good potential, room to improve'
                    : 'Consider tailoring your resume'}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}

          {/* Essential Tools */}
          <SectionHeader title="Essential" subtitle="Core AI tools for your resume" />
          <div className="grid grid-cols-3 gap-3 mb-6">
            <AIActionTile
              icon={<Wand2 className="w-5 h-5 text-primary" />}
              title="Smart Tailor"
              subtitle={<AICostBadge operation="tailor" />}
              onClick={() => {
                onOpenChange(false);
                onTailor();
              }}
            />
            <AIActionTile
              icon={<Target className="w-5 h-5 text-primary" />}
              title="Job Match"
              subtitle={<AICostBadge operation="score" />}
              onClick={() => {
                onOpenChange(false);
                onAnalyze();
              }}
            />
            <AIActionTile
              icon={<Sparkles className="w-5 h-5 text-primary" />}
              title="AI Enhance"
              subtitle={<AICostBadge operation="enhance" />}
              onClick={() => {
                onOpenChange(false);
                onImproveSection();
              }}
            />
          </div>

          {/* Competitive Edge */}
          <SectionHeader title="Competitive Edge" subtitle="Stand out from other candidates" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <AIActionTile
              icon={<UserCheck className="w-5 h-5 text-primary" />}
              title="Recruiter Sim"
              subtitle={<AICostBadge operation="recruiter-sim" />}
              badge="New"
              onClick={() => {
                onOpenChange(false);
                onRecruiterSim?.();
              }}
            />
          </div>

          {/* Active Comparison Banner */}
          {currentComparison && currentComparison.jobs.length > 0 && onViewComparison && (
            <motion.button
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 flex items-center justify-between"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                onOpenChange(false);
                onViewComparison();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Job Comparison Active</p>
                  <p className="text-xs text-muted-foreground">
                    {currentComparison.jobs.length} jobs being compared
                  </p>
                </div>
              </div>
              <Badge variant="secondary">View</Badge>
            </motion.button>
          )}

          {/* Recent Job Description */}
          {jobDescription && (
            <motion.div
              className="mt-4 p-3 rounded-xl glass-surface"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs text-muted-foreground mb-1">Target Job</p>
              <p className="text-sm line-clamp-2">{jobDescription}</p>
            </motion.div>
          )}
        </div>

        {/* Explicit Close Button for Mobile */}
        <div className="shrink-0 p-4 border-t border-border pb-safe">
          <Button 
            variant="ghost" 
            className="w-full h-12" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
