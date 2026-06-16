import { memo, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Crown,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  ArrowUpRight,
} from 'lucide-react';
import { AppIcon } from '@/components/brand/AppIcon';
import { DashboardWorkspaceProfileDialog } from '@/components/dashboard/DashboardWorkspaceProfileDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAICredits } from '@/hooks/useAICredits';
import { usePlan, type PlanName } from '@/hooks/usePlan';
import { useMe } from '@/hooks/useMe';
import { PLAN_CREDIT_LIMITS } from '@/lib/planConfig';
import type { PlanKey } from '@/lib/planConfig';
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
  const { plan: planFromHook, isLoading: planLoading, subscriptionVerified } = usePlan();
  const { data: meData } = useMe();
  const plan = planProp ?? planFromHook;

  const isPremium = plan === 'premium';
  const isPro = plan === 'pro' || plan === 'premium';
  const isPaid = isPro;
  const membershipResolved = subscriptionVerified;
  const showUpgradeCta = membershipResolved && plan === 'free';

  const planLabel =
    plan === 'premium' ? 'Premium plan' : plan === 'pro' ? 'Pro plan' : 'Free plan';
  const membershipTitle =
    plan === 'premium'
      ? 'Premium membership'
      : plan === 'pro'
        ? 'Pro membership'
        : planLoading || !membershipResolved
          ? 'Your membership'
          : 'Free plan';
  const membershipSubtitle =
    plan === 'premium'
      ? 'Full workspace access'
      : plan === 'pro'
        ? 'Advanced AI tools included'
        : planLoading || !membershipResolved
          ? 'Checking your plan…'
          : 'Upgrade for unlimited AI';

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
    // Derive limit from plan if not set — never hardcode 20
    const effectivePlan = (meData?.subscription?.effective_plan ?? 'free') as PlanKey;
    const fallbackLimit = PLAN_CREDIT_LIMITS[effectivePlan] ?? PLAN_CREDIT_LIMITS.free;
    const dailyLimit = credits?.daily_limit;
    const safeLimit = typeof dailyLimit === 'number' && dailyLimit > 0 ? dailyLimit : fallbackLimit;
    return {
      unlimited: false as const,
      used,
      limit: safeLimit,
      remaining: Math.max(0, safeLimit - used),
      footer: 'Resets at midnight',
    };
  }, [credits, creditsLoading, isPremium, isActiveTrial, trialPlan, meData]);

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
          {!effectiveCollapsed && (
            <div
              className={cn(
                'dashboard-workspace-sidebar__membership relative overflow-hidden rounded-xl p-3.5',
                planLoading && 'dashboard-workspace-sidebar__membership--loading',
                isPaid && 'dashboard-workspace-sidebar__membership--paid',
                isPremium && 'dashboard-workspace-sidebar__membership--premium',
                plan === 'pro' && 'dashboard-workspace-sidebar__membership--pro',
                showUpgradeCta && 'dashboard-workspace-sidebar__membership--upgrade',
              )}
            >
              <div className="dashboard-workspace-sidebar__membership-glow" aria-hidden />
              <div className="relative flex items-start gap-2.5 min-w-0">
                <span
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl shrink-0 border shadow-sm',
                    isPremium
                      ? 'bg-gradient-to-br from-amber-400/30 via-amber-500/15 to-amber-600/10 border-amber-500/35'
                      : isPaid
                        ? 'bg-gradient-to-br from-primary/25 to-primary/8 border-primary/30'
                        : 'bg-primary/12 border-primary/25',
                  )}
                >
                  <Crown
                    className={cn(
                      'w-4 h-4',
                      isPremium ? 'text-amber-600 dark:text-amber-400' : isPaid ? 'text-primary' : 'text-amber-500',
                    )}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {membershipTitle}
                    </p>
                    {isPaid ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] border',
                          isPremium
                            ? 'border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300'
                            : 'border-primary/30 bg-primary/10 text-primary',
                        )}
                      >
                        {isPremium ? 'Premium' : 'Pro'}
                      </span>
                    ) : membershipResolved && !planLoading ? (
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] border border-border/60 bg-muted/50 text-muted-foreground">
                        Free
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {membershipSubtitle}
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
                  className={cn(
                    'relative mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-colors',
                    isPremium
                      ? 'border-amber-500/25 bg-background/50 text-amber-900/80 hover:bg-background/80 hover:text-amber-950 dark:text-amber-100/90 dark:hover:text-amber-50'
                      : 'border-border/50 bg-background/40 text-foreground/80 hover:bg-background/70 hover:text-foreground',
                  )}
                  onClick={() => {
                    haptics.light();
                    onBilling();
                  }}
                >
                  Manage billing
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                </button>
              )}
            </div>
          )}

          {effectiveCollapsed && (isPaid || planLoading) && (
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
            <Avatar className="dashboard-workspace-sidebar__avatar w-10 h-10 shrink-0 text-xs font-semibold">
              <AvatarImage src={avatarUrl || undefined} alt={userName || 'Profile'} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!effectiveCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {userName || 'Your profile'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {userEmail?.trim() || planLabel}
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
