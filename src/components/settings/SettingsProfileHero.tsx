import { ChevronRight, Settings } from 'lucide-react';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface SettingsProfileHeroProps {
  plan: string;
  avatarUrl?: string | null;
  initials: string;
  displayName: string;
  email?: string | null;
  planCta: string;
  onOpenProfile: () => void;
  onManagePlan: (e: React.MouseEvent) => void;
  onEditSettings?: () => void;
  className?: string;
}

export function SettingsProfileHero({
  plan,
  avatarUrl,
  initials,
  displayName,
  email,
  planCta,
  onOpenProfile,
  onManagePlan,
  onEditSettings,
  className,
}: SettingsProfileHeroProps) {
  const { t } = useLocale();
  return (
    <div className={cn('settings-profile-hero', className)}>
      <div className="settings-profile-hero__glow" aria-hidden />
      <div className="relative w-full flex items-center gap-4 p-4 sm:p-5 text-left">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-0 flex-1 items-center gap-4 rounded-xl text-left touch-manipulation transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <PlanAvatar
            plan={plan}
            avatarUrl={avatarUrl}
            initials={initials}
            size="h-14 w-14 sm:h-16 sm:w-16"
            showLabel
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              {t('app.settingsPage.profileHero.yourAccount', 'Your account')}
            </p>
            <p className="text-lg font-semibold text-foreground truncate leading-tight mt-0.5">{displayName}</p>
            {email && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{email}</p>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onManagePlan}
            className="text-xs font-semibold text-primary mt-2 hover:underline touch-manipulation"
          >
            {planCta}
          </button>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
        </div>
      </div>
      {onEditSettings && (
        <div className="relative border-t border-border/50 px-4 py-2.5 bg-muted/20">
          <button
            type="button"
            onClick={onEditSettings}
            className="flex w-full items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden />
            {t('app.settingsPage.profileHero.editDetails', 'Edit profile details')}
          </button>
        </div>
      )}
    </div>
  );
}
