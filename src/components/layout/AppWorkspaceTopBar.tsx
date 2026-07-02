import { Plus, MessageCircle, Sun, Moon, Sparkles, Briefcase, Crown, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useTheme } from '@/hooks/use-theme';
import { usePlan } from '@/hooks/usePlan';
import { useWiseWorkspaceStore } from '@/store/wiseWorkspaceStore';
import { getPageTitle } from '@/lib/pageTitles';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

interface AppWorkspaceTopBarProps {
  onImportJob: () => void;
  className?: string;
}

/** Global utility bar: page context + import, Wise AI, notifications, theme. */
export function AppWorkspaceTopBar({ onImportJob, className }: AppWorkspaceTopBarProps) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const toggleWiseChat = useWiseWorkspaceStore((s) => s.toggleChat);
  const wiseChatOpen = useWiseWorkspaceStore((s) => s.open && s.mode === 'chat');
  const { plan, isLoading: planLoading } = usePlan();
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const pageTitle = getPageTitle(pathname) ?? 'WiseResume';
  const showPlanBadge = !planLoading && (plan === 'premium' || plan === 'pro');

  const pathKeyMap: Array<[string, string]> = [
    ['/dashboard', 'app.dashboard'],
    ['/editor', 'common.editor'],
    ['/ai-studio', 'app.aiStudioNavLabel'],
    ['/tailor', 'app.tailoringHub'],
    ['/applications', 'app.applications'],
    ['/portfolio', 'app.portfolio'],
    ['/settings', 'app.settings'],
    ['/profile', 'app.profile'],
    ['/notifications', 'app.notifications'],
    ['/templates', 'app.templatesPage.title'],
    ['/examples', 'app.examples'],
    ['/guides', 'app.guides'],
    ['/help', 'app.help'],
    ['/analytics', 'app.analytics'],
    ['/subscription', 'app.subscription'],
    ['/referral', 'app.referral'],
    ['/achievements', 'app.achievements'],
  ];
  const matchedKey = pathKeyMap.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const translatedTitle = matchedKey ? t(matchedKey) : pageTitle;

  return (
    <header
      className={cn(
        'app-workspace-topbar app-shell-nav relative shrink-0 z-40 w-full',
        'pt-[env(safe-area-inset-top,0px)]',
        className,
      )}
      aria-label={t('app.topBar.actionsAria', 'إجراءات مساحة العمل')}
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
              {t('app.workspace', 'Workspace')}
            </p>
            <h2 className="text-sm lg:text-base font-semibold text-foreground truncate leading-tight mt-1">
              {translatedTitle}
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
                {plan === 'premium' ? t('app.membershipPremiumBadge', 'Premium') : t('app.membershipProBadge', 'Pro')}
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
            aria-label={t('app.topBar.importJobAria', 'استيراد وظيفة')}
          >
            <Briefcase className="w-4 h-4 shrink-0 sm:hidden" aria-hidden />
            <Plus className="w-4 h-4 shrink-0 hidden sm:block" aria-hidden />
            <span className="hidden sm:inline leading-none">{t('app.topBar.importJob', 'استيراد وظيفة')}</span>
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
            aria-label={wiseChatOpen ? t('app.topBar.closeWiseAI', 'إغلاق مساعد وايز') : t('app.topBar.askWiseAI', 'اسأل مساعد وايز')}
            aria-pressed={wiseChatOpen}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-primary" aria-hidden />
            </span>
            <span className="hidden md:inline bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-semibold">
              {t('app.topBar.wiseAI', 'مساعد وايز')}
            </span>
            <span className="md:hidden font-semibold text-primary">{t('app.topBar.wiseAIShort', 'المساعد')}</span>
          </button>

          {/* PORT-NOTIF-09: Bell icon — navigates to /notifications, shows dot badge when unread > 0 */}
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              navigate('/notifications');
            }}
            className={cn(
              'relative inline-flex items-center justify-center shrink-0 w-9 h-9 lg:w-10 lg:h-10 rounded-xl',
              'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95 touch-manipulation',
            )}
            aria-label={t('app.topBar.notifications', 'Notifications')}
          >
            <Bell className="w-4 h-4" aria-hidden />
            {(unreadCount ?? 0) > 0 && (
              <span
                className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary"
                aria-label={`${unreadCount} unread`}
              />
            )}
          </button>

          <span className="w-px h-6 bg-border/60 hidden sm:block" aria-hidden />

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
            aria-label={isDark ? t('app.topBar.switchToLight', 'التبديل إلى الوضع الفاتح') : t('app.topBar.switchToDark', 'التبديل إلى الوضع الداكن')}
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
