import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Keyboard,
  MessageCircle,
  LifeBuoy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FeatureRequestDialog } from './FeatureRequestDialog';
import { KeyboardShortcutsSheet } from '@/components/editor/KeyboardShortcutsSheet';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HelpAction {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  accent?: 'primary' | 'amber' | 'blue';
  onClick: () => void;
}

function HelpActionCard({
  icon: Icon,
  label,
  description,
  accent = 'primary',
  onClick,
}: Omit<HelpAction, 'id'>) {
  const accentRing =
    accent === 'amber'
      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      : accent === 'blue'
        ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
        : 'bg-primary/10 border-primary/20 text-primary';

  return (
    <button
      type="button"
      onClick={() => {
        haptics.light();
        onClick();
      }}
      className={cn(
        'group flex items-center gap-3.5 w-full p-4 rounded-2xl text-left',
        'bg-card border border-border shadow-soft',
        'hover:border-primary/20 hover:bg-primary/[0.03] active:scale-[0.99]',
        'transition-all touch-manipulation',
      )}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
          accentRing,
        )}
      >
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight
        className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </button>
  );
}

export function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  const navigate = useNavigate();
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const closeSheet = useCallback(() => onOpenChange(false), [onOpenChange]);

  const actions: HelpAction[] = [
    {
      id: 'docs',
      icon: BookOpen,
      label: 'Documentation & FAQ',
      description: 'Guides, tips, and answers to common questions',
      accent: 'primary',
      onClick: () => {
        closeSheet();
        navigate('/help');
      },
    },
    {
      id: 'shortcuts',
      icon: Keyboard,
      label: 'Keyboard Shortcuts',
      description: 'Speed up editing with hotkeys across the app',
      accent: 'blue',
      onClick: () => {
        closeSheet();
        setShortcutsOpen(true);
      },
    },
    {
      id: 'features',
      icon: MessageCircle,
      label: 'Feature Requests',
      description: 'Tell us what would make WiseResume better for you',
      accent: 'amber',
      onClick: () => {
        closeSheet();
        setFeatureDialogOpen(true);
      },
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            'gap-0 p-0 overflow-hidden border-t border-border/80 bg-background',
            'rounded-t-[1.75rem] max-h-[min(88dvh,640px)]',
            'sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2',
          )}
        >
          {/* Hero */}
          <div className="relative px-5 pt-2 pb-5 overflow-hidden shrink-0">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -top-10 right-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3.5 pt-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 shadow-soft">
                <LifeBuoy className="w-6 h-6 text-primary" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/90">
                  Support
                </p>
                <h2 className="text-xl font-semibold text-foreground leading-tight mt-0.5">
                  Get Help
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Docs, shortcuts, and a direct line to suggest improvements.
                </p>
              </div>
            </div>
            <div className="relative mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50">
              <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Most answers live in the Help center — start there before contacting support.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2.5">
            {actions.map((action) => (
              <HelpActionCard key={action.id} {...action} />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <KeyboardShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <FeatureRequestDialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen} />
    </>
  );
}
