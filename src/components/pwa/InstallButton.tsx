import { useState, useEffect, useCallback } from 'react';
import { Smartphone, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { haptics } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonProps {
  className?: string;
}

export function InstallButton({ className }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleClick = useCallback(async () => {
    haptics.medium();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') haptics.success();
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      setShowIosSheet(true);
      return;
    }
  }, [deferredPrompt, isIos]);

  // Hide if already installed or if not on a supported platform (no prompt & not iOS)
  if (isInstalled) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        className={`gap-2 h-12 text-base font-medium ${className ?? ''}`}
        onClick={handleClick}
      >
        <Smartphone className="w-5 h-5" />
        Install on Device
      </Button>

      {/* iOS instruction sheet */}
      <Sheet open={showIosSheet} onOpenChange={setShowIosSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="text-center">
            <SheetTitle>Install WiseResume</SheetTitle>
            <SheetDescription>
              Add WiseResume to your home screen for quick access
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Share className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">1. Tap the Share button</p>
                <p className="text-xs text-muted-foreground">
                  At the bottom of Safari's toolbar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">2. Tap "Add to Home Screen"</p>
                <p className="text-xs text-muted-foreground">
                  Scroll down in the share menu to find it
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
