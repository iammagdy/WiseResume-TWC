import { memo, useState, useEffect, ReactNode } from 'react';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'wr-show-examples';

export interface EmptyStateAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

interface SectionEmptyStateProps {
  icon: LucideIcon;
  title: string;
  exampleContent: ReactNode;
  actions: EmptyStateAction[];
}

export const SectionEmptyState = memo(function SectionEmptyState({
  icon: Icon,
  title,
  exampleContent,
  actions,
}: SectionEmptyStateProps) {
  const [showExample, setShowExample] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(showExample));
    } catch { /* noop */ }
  }, [showExample]);

  return (
    <div className="p-6 rounded-xl border border-dashed border-border text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">{title}</p>

      <Collapsible open={showExample} onOpenChange={setShowExample}>
        <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto mt-1">
          {showExample ? 'Hide Example' : 'Show Example'}
          {showExample ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50 text-left">
            <p className="text-[11px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Example</p>
            {exampleContent}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              className={cn('gap-2', action.variant === 'default' && 'min-w-[140px]')}
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
});
