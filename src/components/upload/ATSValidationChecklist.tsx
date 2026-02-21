import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ChevronLeft, Shield } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { runATSValidation, type ATSCheckResult } from '@/lib/atsValidationChecks';
import type { ResumeData } from '@/types/resume';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

interface ATSValidationChecklistProps {
  open: boolean;
  parsedData: ResumeData;
  atsScore: ResumeHealthScore | null;
  onContinue: () => void;
  onBack: () => void;
}

function StatusIcon({ status }: { status: ATSCheckResult['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
  if (status === 'fail') return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
  return <AlertTriangle className="w-5 h-5 text-warning shrink-0" />;
}

function CheckItem({ item, index }: { item: ATSCheckResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.25 }}
    >
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 active:scale-[0.99] transition-all touch-manipulation text-left min-h-[48px]">
            <div className="pt-0.5">
              <StatusIcon status={item.status} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
            </div>
          </button>
        </CollapsibleTrigger>
        {item.tip && (
          <CollapsibleContent>
            <div className="ml-8 mr-3 mb-2 p-3 rounded-lg bg-muted/60 border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">{item.tip}</p>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </motion.div>
  );
}

export function ATSValidationChecklist({
  open,
  parsedData,
  atsScore,
  onContinue,
  onBack,
}: ATSValidationChecklistProps) {
  const checks = useMemo(() => runATSValidation(parsedData), [parsedData]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const totalCount = checks.length;

  // Compute a simple percentage for the ring
  const ringScore = Math.round((passCount / totalCount) * 100);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onBack()}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {/* Header */}
        <SheetHeader className="text-left pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">ATS Compatibility</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {passCount} of {totalCount} checks passed
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Score summary */}
        <div className="flex items-center gap-4 px-1 pb-3 shrink-0">
          <ScoreRing score={atsScore?.overallScore ?? ringScore} size={56} strokeWidth={4} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {failCount === 0 ? 'Looking great!' : `${failCount} issue${failCount > 1 ? 's' : ''} to review`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {failCount === 0
                ? 'Your resume passes all critical ATS checks'
                : 'Fix issues to improve ATS pass rate'}
            </p>
          </div>
        </div>

        {/* Checklist */}
        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-0.5 pb-6">
            {checks.map((item, i) => (
              <CheckItem key={item.id} item={item} index={i} />
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="pt-4 pb-safe border-t border-border shrink-0 space-y-2">
          <Button
            onClick={onContinue}
            className="w-full h-14 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform"
            size="lg"
          >
            Continue to Editor
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground py-2 hover:text-foreground transition-colors touch-manipulation min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
