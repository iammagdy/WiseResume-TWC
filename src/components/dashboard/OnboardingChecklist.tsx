import { useState, useRef } from 'react';
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  steps: ChecklistStep[];
  onDismiss: () => void;
}

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const headingRef = useRef<HTMLElement | null>(null);

  const handleDismiss = () => {
    onDismiss();
    setTimeout(() => {
      const heading = headingRef.current ?? (document.querySelector('[data-dashboard-heading]') as HTMLElement | null) ?? (document.querySelector('h1') as HTMLElement | null);
      heading?.focus();
    }, 50);
  };

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden mb-4"
      aria-label="Getting started checklist"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-expanded={!collapsed}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{pct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {allDone ? 'You're all set!' : 'Getting started'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {completedCount}/{steps.length} steps complete
            </p>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss getting started checklist"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              {steps.map(step => (
                <button
                  key={step.id}
                  disabled={step.done || !step.href}
                  onClick={() => step.href && !step.done && navigate(step.href)}
                  className={cn(
                    'flex items-start gap-3 w-full text-left rounded-xl p-2 -mx-2 transition-colors',
                    !step.done && step.href && 'hover:bg-muted cursor-pointer',
                    step.done && 'cursor-default'
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-medium leading-tight',
                      step.done ? 'line-through text-muted-foreground' : 'text-foreground'
                    )}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {allDone && (
              <div className="px-4 pb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs border-success/40 text-success hover:bg-success/10"
                  onClick={handleDismiss}
                >
                  Got it — I'm all set!
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
