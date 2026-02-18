import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('pwa-install-dismissed');
    if (alreadyDismissed) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    haptics.medium();

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      haptics.success();
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    haptics.light();
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Hide on public portfolio routes
  if (dismissed || !showBanner || location.pathname.startsWith('/p/')) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-[11.5rem] left-4 right-4 z-40 glass-elevated rounded-2xl p-4 shadow-lg"
        style={{
          boxShadow: '0 8px 40px -8px hsl(var(--primary) / 0.3)',
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install WiseResume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quick access from your home screen
            </p>
          </div>
          <Button
            onClick={handleInstall}
            size="sm"
            className="gradient-primary shrink-0 h-9"
          >
            Install
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
