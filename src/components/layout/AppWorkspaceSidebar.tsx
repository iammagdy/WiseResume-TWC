import { memo, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Crown,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { AppIcon } from '@/components/brand/AppIcon';
import { DashboardWorkspaceProfileDialog } from '@/components/dashboard/DashboardWorkspaceProfileDialog';
import { Button } from '@/components/ui/button';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, type PlanName } from '@/hooks/usePlan';
import { useAppSidebarStore } from '@/store/appSidebarStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { APP_SIDEBAR_LINKS, isAppSidebarPathActive } from '@/components/layout/appSidebarNav';

interface AppWorkspaceSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  plan?: PlanName;
  profileCompletion?: number;
  onManageAccount: () => void;
  onSettings: () => void;
  onAdminPanel?: () => void;
  onBilling: () => void;
  onSignOut: () => void | Promise<void>;
  onHelp?: () => void;
  onUpgrade?: () => void;
  adminBadgeCount?: number;
  /** Drawer sheet on mobile — overrides `hidden lg:flex`. */
  forceVisible?: boolean;
  className?: string;
}

export const AppWorkspaceSidebar = memo(function AppWorkspaceSidebar({
  userName,
  userEmail,
  avatarUrl,
  plan: planProp,
  profileCompletion,
  onManageAccount,
  onSettings,
  onAdminPanel,
  onBilling,
  onSignOut,
  onHelp,
  onUpgrade,
  onAdminPanel,
  adminBadgeCount,
  forceVisible = false,
  className,
}: AppWorkspaceSidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = useAppSidebarStore((s) => s.collapsed);
  // Mobile sheet (forceVisible) always renders expanded regardless of the
  // stored collapsed preference — collapsing is a desktop-only affordance.
  const effectiveCollapsed = forceVisible ? false : collapsed;
  const toggleCollapsed = useAppSidebarStore((s) => s.toggleCollapsed);
  const setMobileOpen = useAppSidebarStore((s) => s.setMobileOpen);
  const { data: credits, isLoading: creditsLoading, isActiveTrial, trialPlan } = useAICredits();
  const { plan: planFromHook, isPremium, isPro, isLoading: planLoading } = usePlan();
  const plan = planProp ?? planFromHook;

  const planLabel =
    plan === 'premium' ? 'Premium plan' : plan === 'pro' ? 'Pro plan' : 'Free plan';
  const isPaid = isPremium || isPro;
  const showUpgradeCta = !planLoading && !isPaid;

  const initials = useMemo(() => {
    if (!userName?.trim()) return 'MS';
    return userName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [userName]);

  const creditDisplay = useMemo(() => {
    if (creditsLoading) return null;
    const hasUnlimitedPlan =
      isPremium ||
      (isActiveTrial && trialPlan === 'premium') ||
      !Number.isFinite(credits?.daily_limit) ||
      credits?.daily_limit === -1;
    if (hasUnlimitedPlan) return { unlimited: true as const, footer: null };
    if (!credits) return null;
    const used = credits.daily_usage ?? 0;
    const safeLimit = credits.daily_limit > 0 ? credits.daily_limit : 20;
    return {
      unlimited: false as const,
      used,
      limit: safeLimit,
      remaining: Math.max(0, safeLimit - used),
      footer: 'Resets at midnight',
    };
  }, [credits, creditsLoading, isPremium, isActiveTrial, trialPlan]);

  const creditPct =
    creditDisplay && !creditDisplay.unlimited
      ? Math.min(100, Math.round((creditDisplay.remaining / creditDisplay.limit) * 100))
      : null;

  const navTo = (path: string) => {
    haptics.selection();
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <aside
      className={cn(
        'app-workspace-sidebar dashboard-workspace-sidebar flex-col shrink-0',
        forceVisible ? 'flex h-full' : 'hidden lg:flex',
        'lg:sticky lg:top-0 lg:h-full lg:max-h-[100dvh] lg:overflow-hidden lg:self-stretch',
        effectiveCollapsed && 'app-workspace-sidebar--collapsed',
        className,
      )}
      aria-label="Main navigation"
    >
      <div className="dashboard-workspace-sidebar__inner flex flex-col flex-1 min-h-0 h-full w-full">
        <div
          className={cn(
            'app-workspace-sidebar__head shrink-0 pt-4 pb-2',
            effectiveCollapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-3',
          )}
        >
          <div
            className={cn(
              'flex w-full min-w-0',
              effectiveCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-2',
            )}
          >
            {!forceVisible && (
            <button
              type="button"
              onClick={() => {
                haptics.light();
                toggleCollapsed();
              }}
              className={cn(
                'app-workspace-sidebar__collapse hidden lg:flex shrink-0 items-center justify-center rounded-xl',
                'text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors',
                'min-h-[36px] min-w-[36px] touch-manipulation active:scale-95',
                effectiveCollapsed && 'w-9 h-9',
              )}
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {effectiveCollapsed ? (
                <PanelLeft className="w-[18px] h-[18px]" aria-hidden />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px]" aria-hidden />
              )}
            </button>
            )}
            <Link
              to="/"
              onClick={() => {
                haptics.light();
                window.scrollTo(0, 0);
              }}
              className={cn(
                'dashboard-workspace-sidebar__brand flex items-center rounded-xl transition-colors hover:bg-muted/30 min-w-0',
                effectiveCollapsed ? 'justify-center p-1.5' : 'flex-1 gap-2.5 px-1 py-1.5',
              )}
              aria-label="WiseResume — go to landing page"
            >
              <AppIcon size={effectiveCollapsed ? 28 : 32} className="shrink-0 rounded-lg" />
              {!effectiveCollapsed && (
                <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
                  WiseResume
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className={cn('shrink-0 px-2 pb-2', effectiveCollapsed && 'px-1.5')}>
          {!effectiveCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
              Workspace
            </p>
          )}
          <nav className="flex flex-col gap-1" aria-label="App sections">
            {APP_SIDEBAR_LINKS.map(({ path, label, icon: Icon, match }) => {
              const active = isAppSidebarPathActive(location.pathname, match);
              return (
                <button
                  key={path}
                  type="button"
                  title={effectiveCollapsed ? label : undefined}
                  onClick={() => navTo(path)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'dashboard-workspace-nav-item relative flex items-center rounded-xl text-[13px] text-left transition-colors min-h-[44px] w-full',
                    effectiveCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 pl-3 pr-3 py-2.5',
                    active
                      ? 'dashboard-workspace-nav-item--active text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/35',
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0 opacity-90" aria-hidden />
                  {!effectiveCollapsed && label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 min-h-0" aria-hidden />

        <div
          className={cn(
            'dashboard-workspace-sidebar__meta shrink-0 border-t border-border/30 px-3 pt-2.5 pb-0 space-y-2.5',
            effectiveCollapsed && 'px-2',
          )}
        >
          {!effectiveCollapsed && (showUpgradeCta || isPaid || creditDisplay) && (
            <div
              className={cn(
                'dashboard-workspace-sidebar__membership rounded-xl p-3.5',
                isPaid && 'dashboard-workspace-sidebar__membership--paid',
                showUpgradeCta && !isPaid && 'dashboard-workspace-sidebar__membership--upgrade',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 border',
                    isPaid
                      ? 'bg-amber-500/15 border-amber-500/30'
                      : 'bg-primary/12 border-primary/25',
                  )}
                >
                  <Crown className="w-4 h-4 text-amber-500" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {isPaid
                      ? isPremium
                        ? 'Premium membership'
                        : 'Pro membership'
                      : 'Your membership'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {isPaid
                      ? isPremium
                        ? 'Full workspace access'
                        : 'Advanced AI tools included'
                      : 'Upgrade for unlimited AI'}
                  </p>
                </div>
              </div>
              {showUpgradeCta && (
                <Button
                  size="sm"
                  className="mt-3 w-full h-9 rounded-lg text-xs font-medium shadow-none"
                  onClick={() => {
                    haptics.light();
                    navigate('/subscription');
                    onUpgrade?.();
                  }}
                >
                  View plans & upgrade
                </Button>
              )}
              {creditDisplay && !creditDisplay.unlimited && (
                <div
                  className={cn(
                    'dashboard-workspace-sidebar__membership-credits',
                    (showUpgradeCta || isPaid) && 'mt-3 pt-3 border-t border-border/35',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      AI credits
                    </p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {creditDisplay.remaining}
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / {creditDisplay.limit}
                      </span>
                    </p>
                  </div>
                  {creditPct != null && (
                    <div
                      className="dashboard-workspace-sidebar__credits-bar mt-2 h-1.5 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={creditPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-300"
                        style={{ width: `${creditPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {isPaid && (
                <button
                  type="button"
                  className="mt-3 w-full text-left text-[10px] font-medium text-primary/90 hover:text-primary transition-colors"
                  onClick={() => {
                    haptics.light();
                    onBilling();
                  }}
                >
                  Manage billing →
                </button>
              )}
            </div>
          )}

          {effectiveCollapsed && isPaid && (
            <button
              type="button"
              title="Membership"
              onClick={() => {
                haptics.light();
                onBilling();
              }}
              className="flex justify-center w-full p-2 rounded-xl hover:bg-muted/35"
            >
              <Crown className="w-5 h-5 text-amber-500" aria-hidden />
            </button>
          )}

          <button
            type="button"
            title={effectiveCollapsed ? userName || 'Profile' : undefined}
            className={cn(
              'dashboard-workspace-sidebar__panel dashboard-workspace-sidebar__profile w-full rounded-xl text-left flex items-center hover:border-primary/30 transition-colors',
              effectiveCollapsed ? 'justify-center p-2 min-h-[48px]' : 'p-3 gap-3 min-h-[56px]',
            )}
            aria-expanded={profileMenuOpen}
            aria-haspopup="dialog"
            onClick={() => {
              haptics.light();
              setProfileMenuOpen(true);
            }}
          >
            <span className="dashboard-workspace-sidebar__avatar flex items-center justify-center w-10 h-10 rounded-full text-xs font-semibold shrink-0">
              {initials}
            </span>
            {!effectiveCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {userName || 'Your profile'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {userEmail?.trim() || (!isPaid ? planLabel : 'Signed in')}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
                    profileMenuOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </>
            )}
          </button>
        </div>
      </div>

      <DashboardWorkspaceProfileDialog
        open={profileMenuOpen}
        onOpenChange={setProfileMenuOpen}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        plan={plan}
        profileCompletion={profileCompletion}
        showUpgrade={showUpgradeCta}
        onManageAccount={onManageAccount}
        onSettings={onSettings}
        onAdminPanel={onAdminPanel}
        onBilling={onBilling}
        onHelp={onHelp}
        onUpgrade={onUpgrade}
        onSignOut={onSignOut}
        adminBadgeCount={adminBadgeCount}
      />
    </aside>
  );
});
