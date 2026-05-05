import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { grantConsent, rejectConsent, hasConsentDecision } from '@/lib/visitorTrack';
import { X } from 'lucide-react';

/**
 * GDPR-compliant consent banner.
 * Rendered at the root layout so it appears on every page for first-time
 * visitors. Once answered (accept or decline) it never re-appears.
 * No tracking fires until consent is granted.
 */
export function ConsentBanner() {
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
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 md:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">We use analytics cookies</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            We track anonymous usage data to improve the product — page views, feature usage, and navigation patterns.
            No personal data is sold. You can opt out at any time.{' '}
            <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
              Privacy policy
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
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-xs h-8"
          >
            Accept
          </Button>
          <button
            onClick={handleDecline}
            aria-label="Dismiss"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
