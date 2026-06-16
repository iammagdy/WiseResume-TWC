import { Plus, MessageCircle, Sun, Moon, Sparkles, Briefcase, Crown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/usePlan';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';
import { getPageTitle } from '@/lib/pageTitles';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface AppWorkspaceTopBarProps {
  onImportJob: () => void;
  className?: string;
}

/** Global utility bar: page context + import, Wise AI, theme. */
export function AppWorkspaceTopBar({ onImportJob, className }: AppWorkspaceTopBarProps) {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const toggleWiseChat = useWiseWorkspaceStore((s) => s.toggleChat);
  const wiseChatOpen = useWiseWorkspaceStore((s) => s.open && s.mode === 'chat');
  const { plan, isLoading: planLoading } = usePlan();

  const pageTitle = getPageTitle(pathname) ?? 'WiseResume';
  const showPlanBadge = !planLoading && (plan === 'premium' || plan === 'pro');

  return (
    <header
      className={cn(
        'app-workspace-topbar app-shell-nav relative shrink-0 z-40 w-full',
        'pt-[env(safe-area-inset-top,0px)]',
        className,
      )}
      aria-label="Workspace actions"
    >
      <GlassSurface className="absolute inset-0 app-shell-nav-glass" blur={18} saturate={165} />
      <div
        className="app-workspace-topbar__glow pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        aria-hidden
      />

      <div className="app-workspace-topbar__inner relative z-[1] flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-5 lg:px-6 w-full min-w-0 h-14 lg:h-[72px]">
        {/* Page context — fills space left by removed search */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'hidden sm:flex h-10 w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-xl',
              'bg-primary/10 border border-primary/20 shadow-soft-sm',
            )}
            aria-hidden
          >
            <Sparkles className="w-4 h-4 lg:w-[18px] lg:h-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 leading-none">
              Workspace
            </p>
            <h2 className="text-sm lg:text-base font-semibold text-foreground truncate leading-tight mt-1">
              {pageTitle}
            </h2>
            {showPlanBadge && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] border',
                  plan === 'premium'
                    ? 'border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300'
                    : 'border-primary/30 bg-primary/10 text-primary',
                )}
              >
                <Crown className="w-3 h-3 shrink-0" aria-hidden />
                {plan === 'premium' ? 'Premium' : 'Pro'}
              </span>
            )}
          </div>
        </div>

        {/* Action rail */}
        <div
          className={cn(
            'app-workspace-topbar__actions flex items-center gap-1 sm:gap-1.5 shrink-0',
            'p-1 rounded-2xl border border-border/70 bg-card/55 backdrop-blur-md shadow-soft-sm',
          )}
        >
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onImportJob();
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 h-9 lg:h-10 rounded-xl text-sm font-semibold',
              'border border-border/80 bg-card/80 text-foreground',
              'hover:bg-muted/60 active:scale-[0.98] transition-all touch-manipulation',
            )}
            aria-label="Import a job"
          >
            <Briefcase className="w-4 h-4 shrink-0 sm:hidden" aria-hidden />
            <Plus className="w-4 h-4 shrink-0 hidden sm:block" aria-hidden />
            <span className="hidden sm:inline leading-none">Import Job</span>
          </button>

          <span className="w-px h-6 bg-border/60 hidden sm:block" aria-hidden />

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              toggleWiseChat();
            }}
            className={cn(
              'app-workspace-topbar__wise-ai inline-flex items-center justify-center gap-1.5',
              'px-2.5 sm:px-3 h-9 lg:h-10 rounded-xl text-sm font-medium leading-none',
              'border border-primary/20 bg-primary/[0.06] text-foreground',
              'hover:border-primary/35 hover:bg-primary/10 transition-all active:scale-[0.98] touch-manipulation',
              wiseChatOpen &&
                'border-primary/45 bg-primary/12 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]',
            )}
            aria-label={wiseChatOpen ? 'Close Wise AI' : 'Ask Wise AI'}
            aria-pressed={wiseChatOpen}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-primary" aria-hidden />
            </span>
            <span className="hidden md:inline bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-semibold">
              Wise AI
            </span>
            <span className="md:hidden font-semibold text-primary">AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              toggleTheme();
            }}
            className={cn(
              'inline-flex items-center justify-center shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-xl',
              'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95 touch-manipulation',
            )}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="relative flex items-center justify-center w-4 h-4">
              <Sun
                className={cn(
                  'w-4 h-4 transition-all duration-200',
                  isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90 scale-0',
                )}
              />
              <Moon
                className={cn(
                  'w-4 h-4 absolute inset-0 m-auto transition-all duration-200',
                  isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0',
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
