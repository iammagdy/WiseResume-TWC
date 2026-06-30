import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { grantConsent, rejectConsent, hasConsentDecision } from '@/lib/visitorTrack';
import { X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * GDPR-compliant consent banner for WiseResume app usage.
 * Shown only inside the product (dashboard, editor, etc.) — not on public
 * portfolio, share, or short-link pages where visitors are not platform users.
 */
export function ConsentBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a choice yet
    if (!hasConsentDecision()) {
      // Small delay so it doesn't flash immediately on first paint
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    grantConsent();
    setVisible(false);
  };

  const handleDecline = () => {
    rejectConsent();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t('app.consentBanner.ariaLabel')}
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 md:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('app.consentBanner.title')}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t('app.consentBanner.description')}{' '}
            <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
              {t('app.consentBanner.privacyPolicy')}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="text-xs h-8"
          >
            {t('app.consentBanner.decline')}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-xs h-8"
          >
            {t('app.consentBanner.accept')}
          </Button>
          <button
            onClick={handleDecline}
            aria-label={t('common.dismiss')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
