import { useRef, useEffect, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import wiseAiLogo from '@/assets/wise-ai-logo.png';

interface PortfolioQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioUrl: string;
  displayUrl: string;
  onShare: () => void;
}

const formatDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];
    return `${urlObj.hostname}/.../${slug}`;
  } catch {
    return url;
  }
};

export function PortfolioQRDialog({ open, onOpenChange, portfolioUrl, displayUrl, onShare }: PortfolioQRDialogProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [size] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 360 ? 240 : 280));

  useEffect(() => {
    if (!open || !qrRef.current) return;

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: portfolioUrl || 'https://wiseresume.lovable.app',
        image: wiseAiLogo,
        margin: 6,
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.35,
          margin: 6,
          crossOrigin: 'anonymous',
        },
        dotsOptions: {
          type: 'rounded',
          gradient: {
            type: 'radial',
            rotation: 0,
            colorStops: [
              { offset: 0, color: '#a855f7' },
              { offset: 1, color: '#ec4899' },
            ],
          },
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#a855f7',
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#ec4899',
        },
        backgroundOptions: {
          color: '#18181b',
        },
      });
    }

    qrRef.current.innerHTML = '';
    qrCodeRef.current.append(qrRef.current);
  }, [open, size, portfolioUrl]);

  useEffect(() => {
    if (qrCodeRef.current && portfolioUrl) {
      qrCodeRef.current.update({ data: portfolioUrl });
    }
  }, [portfolioUrl]);

  const handleDownload = () => {
    haptics.light();
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
        name: 'wiseresume-portfolio-qr',
        extension: 'png',
      });
      toast.success('QR code downloaded!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] p-6">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-primary" /> Your Portfolio QR
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="flex items-center justify-center w-full">
            <div
              ref={qrRef}
              className="rounded-2xl overflow-hidden shadow-lg shadow-purple-500/20"
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono text-center truncate max-w-[200px] mx-auto">{formatDisplayUrl(displayUrl)}</p>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" className="h-11 rounded-xl active:scale-95 touch-manipulation text-xs" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1.5" /> Download QR
            </Button>
            <Button variant="outline" className="h-11 rounded-xl active:scale-95 touch-manipulation text-xs" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-1.5" />
              {typeof navigator !== 'undefined' && navigator.share ? 'Share' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
