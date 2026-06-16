import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AppIcon } from '@/components/brand/AppIcon';
import { openExternal } from '@/lib/openExternal';
import { getAppUrl } from '@/lib/portfolioUrl';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appVersion: string;
}

export function AboutDialog({ open, onOpenChange, appVersion }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <AppIcon size={48} />
            <DialogTitle className="text-center">WiseResume</DialogTitle>
            <DialogDescription className="text-center font-mono text-xs">
              {appVersion}
            </DialogDescription>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Build a professional resume in minutes with AI-powered writing assistance. Made with care in Egypt.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <button
            type="button"
            className="text-left text-primary hover:underline"
            onClick={() => openExternal('mailto:contact@magdysaber.com')}
          >
            Contact support
          </button>
          <button
            type="button"
            className="text-left text-primary hover:underline"
            onClick={() => openExternal(getAppUrl())}
          >
            wisresume.com
          </button>
          <Link to="/privacy-policy" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
            Terms of Service
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
