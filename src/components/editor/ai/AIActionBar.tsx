import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AIAction {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface AIActionBarProps {
  primaryActions: AIAction[];
  moreActions?: AIAction[];
  onAction: (actionId: string) => void;
  isLoading: boolean;
  loadingAction?: string | null;
  disabled?: boolean;
  isSavingRef?: React.MutableRefObject<boolean>;
}

export function AIActionBar({
  primaryActions,
  moreActions,
  onAction,
  isLoading,
  loadingAction,
  disabled = false,
  isSavingRef,
}: AIActionBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    setHasOverflow(overflow);
    if (overflow) {
      setIsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    } else {
      setIsAtEnd(true);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, primaryActions, moreActions]);

  // Coordinate AI action with autosave: if saving, defer by 300ms
  const handleAction = useCallback((actionId: string) => {
    if (isSavingRef?.current) {
      setTimeout(() => onAction(actionId), 300);
    } else {
      onAction(actionId);
    }
  }, [onAction, isSavingRef]);

  const showFade = hasOverflow && !isAtEnd;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20"
    >
      <div className="flex items-center gap-1.5 text-primary shrink-0">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">AI Assist</span>
      </div>

      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide snap-x-mandatory"
        >
          {primaryActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => handleAction(action.id)}
              disabled={disabled || isLoading}
              className="shrink-0 h-11 px-4 text-sm gap-2 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors snap-start touch-manipulation"
            >
              {isLoading && loadingAction === action.id ? (
                <MiniSpinner size={16} />
              ) : action.icon ? (
                <span className="[&>svg]:w-4 [&>svg]:h-4">{action.icon}</span>
              ) : null}
              {action.label}
            </Button>
          ))}

          {moreActions && moreActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || isLoading}
                  className="shrink-0 h-11 px-4 text-sm gap-1.5 border-primary/30 snap-start touch-manipulation"
                >
                  More
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {moreActions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={isLoading}
                    className="py-3.5 text-sm"
                  >
                    {action.icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{action.icon}</span>}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right-side fade gradient to indicate more scrollable content */}
        {showFade && (
          <div
            className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent, hsl(var(--background) / 0.9))',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
