import { motion } from 'framer-motion';
import { Wand2, Target, Sparkles, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { JobMatchScore } from '@/types/resume';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';

interface AIActionTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

function AIActionTile({ icon, title, subtitle, onClick }: AIActionTileProps) {
  return (
    <motion.button
      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/50 border border-border hover:border-primary/50 transition-all touch-manipulation min-h-[100px]"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
        {icon}
      </div>
      <span className="font-medium text-sm text-center">{title}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground mt-0.5">{subtitle}</span>
      )}
    </motion.button>
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
}: AIHubSheetProps) {
  const { currentComparison } = useResumeStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Assistant
          </SheetTitle>
        </SheetHeader>

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

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <AIActionTile
            icon={<Wand2 className="w-5 h-5 text-primary" />}
            title="Tailor Resume"
            subtitle="For a specific job"
            onClick={() => {
              onOpenChange(false);
              onTailor();
            }}
          />
          <AIActionTile
            icon={<Target className="w-5 h-5 text-primary" />}
            title="Analyze Match"
            subtitle="Score your fit"
            onClick={() => {
              onOpenChange(false);
              onAnalyze();
            }}
          />
          <AIActionTile
            icon={<Sparkles className="w-5 h-5 text-primary" />}
            title="Improve Section"
            subtitle={activeTab ? `Current: ${activeTab}` : undefined}
            onClick={() => {
              onOpenChange(false);
              onImproveSection();
            }}
          />
          <AIActionTile
            icon={<FileText className="w-5 h-5 text-primary" />}
            title="Change Template"
            onClick={() => {
              onOpenChange(false);
              onChangeTemplate();
            }}
          />
        </div>

        {/* Active Comparison Banner */}
        {currentComparison && currentComparison.jobs.length > 0 && onViewComparison && (
          <motion.button
            className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 flex items-center justify-between"
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
            className="mt-4 p-3 rounded-xl bg-muted/50 border border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs text-muted-foreground mb-1">Target Job</p>
            <p className="text-sm line-clamp-2">{jobDescription}</p>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
