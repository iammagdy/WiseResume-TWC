import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Target,
  ArrowUpRight,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Briefcase,
  GraduationCap,
  BarChart3,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/resumeStore';
import {
  analyzeCareerPath,
  CareerPathResult,
  NextRole,
  SkillGap,
  IndustryAlternative,
  ActionStep,
} from '@/lib/careerPath';
import { haptics } from '@/lib/haptics';
import { useAIAction } from '@/hooks/useAIAction';

interface CareerPathSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    entry: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    mid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    senior: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    lead: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    executive: 'bg-red-500/15 text-red-400 border-red-500/20',
  };

  return (
    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', colors[level] || colors.mid)}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Level
    </span>
  );
}

function RoleCard({ role }: { role: NextRole }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.button
      className="w-full text-left p-4 rounded-xl glass-surface border border-border/50 active:scale-[0.98] transition-transform touch-manipulation"
      onClick={() => setExpanded(!expanded)}
      layout
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{role.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{role.timeToReady}</span>
          </div>
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            role.matchScore >= 70
              ? 'bg-success/15 text-success'
              : role.matchScore >= 40
              ? 'bg-warning/15 text-warning'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {role.matchScore}%
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted-foreground mt-3 mb-2">{role.description}</p>

            {role.existingSkills.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-success mb-1">Skills you have:</p>
                <div className="flex flex-wrap gap-1">
                  {role.existingSkills.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] border-success/30 text-success">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {role.requiredSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-warning mb-1">Skills to develop:</p>
                <div className="flex flex-wrap gap-1">
                  {role.requiredSkills.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px] border-warning/30 text-warning">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function SkillGapCard({ gap }: { gap: SkillGap }) {
  const priorityConfig = {
    critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    important: { icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
    'nice-to-have': { icon: Target, color: 'text-muted-foreground', bg: 'bg-muted' },
  };
  const config = priorityConfig[gap.priority];
  const Icon = config.icon;

  return (
    <div className="p-3 rounded-xl glass-surface flex gap-3">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{gap.skill}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{gap.suggestion}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {gap.forRoles.map((r) => (
            <span key={r} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndustryCard({ alt }: { alt: IndustryAlternative }) {
  const salaryIcon = {
    higher: { icon: ArrowUpRight, color: 'text-success', label: 'Higher pay' },
    similar: { icon: BarChart3, color: 'text-muted-foreground', label: 'Similar pay' },
    lower: { icon: ArrowUpRight, color: 'text-destructive rotate-90', label: 'Lower pay' },
  };
  const salary = salaryIcon[alt.salaryComparison];

  return (
    <div className="p-4 rounded-xl glass-surface">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">{alt.industry}</h4>
        </div>
        <span className={cn('text-[10px] flex items-center gap-0.5', salary.color)}>
          <salary.icon className="w-3 h-3" />
          {salary.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">Role: {alt.role}</p>
      <div className="flex flex-wrap gap-1">
        {alt.transferableSkills.map((s) => (
          <Badge key={s} variant="outline" className="text-[10px]">
            {s}
          </Badge>
        ))}
      </div>
      {alt.newSkillsNeeded.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1">New skills needed:</p>
          <div className="flex flex-wrap gap-1">
            {alt.newSkillsNeeded.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] border-warning/30 text-warning">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionPlanStep({ step }: { step: ActionStep }) {
  const impactColors = {
    high: 'bg-success/15 text-success border-success/20',
    medium: 'bg-warning/15 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
          {step.step}
        </div>
        <div className="w-px flex-1 bg-border/50 mt-1" />
      </div>
      <div className="pb-4 flex-1">
        <p className="text-sm font-medium">{step.action}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{step.timeframe}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', impactColors[step.impact])}>
            {step.impact} impact
          </span>
        </div>
      </div>
    </div>
  );
}

export function CareerPathSheet({ open, onOpenChange }: CareerPathSheetProps) {
  const { currentResume } = useResumeStore();
  const [result, setResult] = useState<CareerPathResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { execute: executeAI } = useAIAction({ operation: 'career-assessment' });

  const handleAnalyze = async () => {
    if (!currentResume) return;
    setIsLoading(true);
    setError(null);
    haptics.medium();

    try {
      const data = await executeAI(async () => analyzeCareerPath(currentResume));
      if (!data) return;
      setResult(data);
      haptics.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Career Path Advisor
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0">
          {!result && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 opacity-80">
                <Briefcase className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Where could your career go?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[300px]">
                AI will analyze your resume and suggest realistic next career moves, skill gaps, and an action plan.
              </p>

              {error && (
                <p className="text-sm text-destructive mb-4">{error}</p>
              )}

              <Button
                onClick={handleAnalyze}
                className="gradient-primary h-12 px-8"
                disabled={!currentResume}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze My Career Path
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium">Analyzing your career trajectory...</p>
              <p className="text-xs text-muted-foreground mt-1">This takes about 10 seconds</p>
            </div>
          )}

          {result && !isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-3 p-4 rounded-xl glass-elevated mb-4">
                <GraduationCap className="w-6 h-6 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{result.primaryField}</p>
                  <p className="text-xs text-muted-foreground">
                    ~{result.yearsExperience} years experience
                  </p>
                </div>
                <LevelBadge level={result.currentLevel} />
              </div>

              <Tabs defaultValue="roles" className="w-full">
                <TabsList className="w-full h-auto p-1 gap-1">
                  <TabsTrigger value="roles" className="flex-1 text-xs py-2 min-h-[40px]">
                    Next Roles
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="flex-1 text-xs py-2 min-h-[40px]">
                    Skill Gaps
                  </TabsTrigger>
                  <TabsTrigger value="industries" className="flex-1 text-xs py-2 min-h-[40px]">
                    Industries
                  </TabsTrigger>
                  <TabsTrigger value="plan" className="flex-1 text-xs py-2 min-h-[40px]">
                    Action Plan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="mt-4 space-y-3">
                  {result.nextRoles.map((role, i) => (
                    <RoleCard key={i} role={role} />
                  ))}
                </TabsContent>

                <TabsContent value="skills" className="mt-4 space-y-3">
                  {result.skillGaps.map((gap, i) => (
                    <SkillGapCard key={i} gap={gap} />
                  ))}
                </TabsContent>

                <TabsContent value="industries" className="mt-4 space-y-3">
                  {result.industryAlternatives.map((alt, i) => (
                    <IndustryCard key={i} alt={alt} />
                  ))}
                </TabsContent>

                <TabsContent value="plan" className="mt-4">
                  {result.actionPlan.map((step, i) => (
                    <ActionPlanStep key={i} step={step} />
                  ))}
                </TabsContent>
              </Tabs>

              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleAnalyze}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Re-analyze
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
