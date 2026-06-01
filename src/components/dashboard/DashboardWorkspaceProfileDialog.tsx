import { memo } from 'react';
import {
  User,
  Settings,
  Crown,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import type { PlanName } from '@/hooks/usePlan';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface ProfileMenuAction {
  id: string;
  label: string;
  description?: string;
  icon: typeof User;
  onClick: () => void;
  destructive?: boolean;
}

interface DashboardWorkspaceProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  plan: PlanName;
  profileCompletion?: number;
  showUpgrade?: boolean;
  onManageAccount: () => void;
  onSettings: () => void;
  onBilling: () => void;
  onHelp?: () => void;
  onUpgrade?: () => void;
  onSignOut: () => void | Promise<void>;
  /** If provided, an "Admin Panel" item is shown at the top of the menu. */
  onAdminPanel?: () => void;
  /** Unread count badge shown on the admin item (e.g. pending bug reports). */
  adminBadgeCount?: number;
}

function planDisplayName(plan: PlanName) {
  if (plan === 'premium') return 'Premium';
  if (plan === 'pro') return 'Pro';
  return 'Free';
}

export const DashboardWorkspaceProfileDialog = memo(function DashboardWorkspaceProfileDialog({
  open,
  onOpenChange,
  userName,
  userEmail,
  avatarUrl,
  plan,
  profileCompletion,
  showUpgrade = false,
  onManageAccount,
  onSettings,
  onBilling,
  onHelp,
  onUpgrade,
  onSignOut,
  onAdminPanel,
  adminBadgeCount = 0,
}: DashboardWorkspaceProfileDialogProps) {
  const initials = userName?.trim()
    ? userName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MS';

  const run = (action: () => void | Promise<void>) => {
    haptics.light();
    onOpenChange(false);
    void action();
  };

  const menuItems: ProfileMenuAction[] = [
    {
      id: 'profile',
      label: 'Profile',
      description: 'Name, photo, and career details',
      icon: User,
      onClick: onManageAccount,
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Theme, notifications, and privacy',
      icon: Settings,
      onClick: onSettings,
    },
    {
      id: 'billing',
      label: 'Plan & billing',
      description: `${planDisplayName(plan)} plan · invoices and usage`,
      icon: plan === 'free' ? CreditCard : Crown,
      onClick: onBilling,
    },
    ...(onHelp
      ? [
          {
            id: 'help',
            label: 'Help & features',
            description: 'Tour the workspace and shortcuts',
            icon: HelpCircle,
            onClick: onHelp,
          } as ProfileMenuAction,
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <div className="dashboard-profile-dialog__hero px-5 pt-5 pb-4 border-b border-border/40">
          <DialogHeader className="text-left space-y-0">
            <DialogTitle className="sr-only">Account menu</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your WiseResume account, plan, and session
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3.5">
            <PlanAvatar
              plan={plan}
              size="h-14 w-14"
              avatarUrl={avatarUrl}
              imageAlt={userName || 'Profile'}
              initials={initials}
              showLabel
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground truncate leading-tight">
                {userName?.trim() || 'Your account'}
              </p>
              {userEmail && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">{userEmail}</p>
              )}
              <p className="text-[11px] text-muted-foreground/90 mt-1.5 capitalize">
                {planDisplayName(plan)} plan
              </p>
            </div>
          </div>

          {profileCompletion != null && profileCompletion < 80 && (
            <div className="mt-3.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Complete your profile</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {profileCompletion}% done — unlock better tailoring
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-lg shrink-0"
                onClick={() => run(onManageAccount)}
              >
                Finish
              </Button>
            </div>
          )}

          {showUpgrade && onUpgrade && (
            <Button
              size="sm"
              className="mt-3 w-full h-9 rounded-xl text-xs font-semibold shadow-none"
              onClick={() => run(onUpgrade)}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Upgrade to Premium
            </Button>
          )}
        </div>

        <nav className="p-2" aria-label="Account actions">
          <ul className="space-y-0.5">
            {onAdminPanel && (
              <>
                <li>
                  <button
                    type="button"
                    className="dashboard-profile-dialog__item w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left min-h-[52px] touch-manipulation transition-colors hover:bg-blue-500/10 active:scale-[0.99]"
                    onClick={() => run(onAdminPanel)}
                  >
                    <span className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 shrink-0">
                      <ShieldCheck className="w-4 h-4 text-blue-500" aria-hidden />
                      {adminBadgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                          {adminBadgeCount > 99 ? '99+' : adminBadgeCount}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-blue-500 block">Admin Panel</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">DevKit · app control centre</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-blue-500/50 shrink-0" aria-hidden />
                  </button>
                </li>
                <li className="py-1"><div className="h-px bg-border/40 mx-2" /></li>
              </>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="dashboard-profile-dialog__item w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left min-h-[52px] touch-manipulation transition-colors hover:bg-muted/40 active:scale-[0.99]"
                    onClick={() => run(item.onClick)}
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/50 border border-border/40 shrink-0">
                      <Icon className="w-4 h-4 text-foreground/85" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground block">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-muted-foreground block mt-0.5 line-clamp-1">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-2 pt-0 pb-3 border-t border-border/30 mt-1">
          <button
            type="button"
            className={cn(
              'dashboard-profile-dialog__item w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left min-h-[48px] touch-manipulation transition-colors',
              'hover:bg-destructive/10 active:scale-[0.99]',
            )}
            onClick={() => {
              haptics.warning();
              onOpenChange(false);
              void onSignOut();
            }}
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 border border-destructive/20 shrink-0">
              <LogOut className="w-4 h-4 text-destructive" aria-hidden />
            </span>
            <span className="text-sm font-medium text-destructive">Sign out</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
