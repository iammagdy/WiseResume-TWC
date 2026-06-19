import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Suspense } from 'react';
import { AppIcon } from '@/components/brand/AppIcon';
import developerPhoto from '@/assets/developer-photo.png';
import { openExternal } from '@/lib/openExternal';
import { cn } from '@/lib/utils';

const ProfileCard = lazyWithRetry(() => import('@/components/settings/ProfileCard'));

interface SettingsFooterProps {
  appVersion: string;
  className?: string;
}

export function SettingsFooter({ appVersion, className }: SettingsFooterProps) {
  return (
    <footer className={cn('space-y-5 pt-2', className)}>
      <div className="text-center px-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Built by the team
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Questions or feedback? Reach out anytime.
        </p>
      </div>

      <Suspense fallback={<div className="h-48 rounded-2xl bg-muted/30 animate-pulse max-w-sm mx-auto" />}>
        <div className="max-w-sm mx-auto">
          <ProfileCard
            name="Magdy Saber"
            title="Creator & Developer"
            avatarUrl={developerPhoto}
            contactText="Contact Me"
            showUserInfo
            enableTilt
            behindGlowEnabled
            onContactClick={() => openExternal('mailto:contact@magdysaber.com')}
          />
        </div>
      </Suspense>

      <div className="settings-footer-brand flex flex-col items-center gap-3 px-4 py-5 text-center">
        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-soft">
          <AppIcon size={44} showSparkle={false} className="w-full h-full" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">WiseResume</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{appVersion}</p>
        </div>
        <p className="text-xs text-muted-foreground">Made with care in Egypt</p>
      </div>
    </footer>
  );
}
