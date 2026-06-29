import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from './LocaleProvider';
import { getLocalizedPublicPath, type SupportedLocale } from './core';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className={cn('flex items-center gap-2 text-sm', className)}>
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium text-foreground">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as SupportedLocale;
          setLocale(nextLocale);
          const nextPath = getLocalizedPublicPath(window.location.pathname, nextLocale);
          if (nextPath !== window.location.pathname) {
            window.history.pushState({}, '', `${nextPath}${window.location.search}${window.location.hash}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }}
        className="ms-auto min-w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="en">{t('common.english')}</option>
        <option value="ar">{t('common.arabic')}</option>
      </select>
    </label>
  );
}
