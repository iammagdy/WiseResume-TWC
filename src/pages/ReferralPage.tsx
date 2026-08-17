import { useEffect, useRef } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Linkedin, MessageCircle, ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getAppUrl } from '@/lib/portfolioUrl';

export default function ReferralPage() {
  const qrRef = useRef<HTMLDivElement>(null);
  const shareLink = getAppUrl();

  // QR code
  useEffect(() => {
    const qrContainer = qrRef.current;
    if (!qrContainer) return;
    let cancelled = false;
    let qr: import('qr-code-styling').default | undefined;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      qr = new QRCodeStyling({
        width: 160,
        height: 160,
        data: shareLink,
        dotsOptions: { type: 'rounded', color: 'hsl(var(--primary))' },
        backgroundOptions: { color: 'transparent' },
        cornersSquareOptions: { type: 'extra-rounded' },
      });
      if (!cancelled) {
        qrContainer.innerHTML = '';
        qr.append(qrContainer);
      }
    });
    return () => {
      cancelled = true;
      qrContainer.innerHTML = '';
    };
  }, [shareLink]);

  const handleCopy = async () => {
    haptics.light();
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('WiseResume link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleShare = async () => {
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join WiseResume',
          text: 'Build and review professional resumes with WiseResume.',
          url: shareLink,
        });
    } catch { /* share cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleCopyMessage = async () => {
    haptics.light();
    const message = `I use WiseResume to build and review professional resumes. Here is the app: ${shareLink}`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copied!');
    } catch {
      toast.error('Could not copy message');
    }
  };

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out WiseResume: ${shareLink}`)}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Share WiseResume</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24 lg:max-w-none mx-auto w-full">
        {/* Share link */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Send the public WiseResume homepage to someone who may find it useful.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptics.light()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0077B5]" />
                LinkedIn
              </a>
              <a
                href={whatsAppShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptics.light()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                WhatsApp
              </a>
              <button
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted transition-colors"
              >
                <ClipboardCopy className="w-3.5 h-3.5 text-muted-foreground" />
                Copy Message
              </button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-2">
            <p className="text-sm font-medium">Scan to Join</p>
            <div ref={qrRef} className="rounded-xl overflow-hidden" />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
