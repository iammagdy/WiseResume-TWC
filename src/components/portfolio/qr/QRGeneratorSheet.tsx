import { useRef, useEffect, useState, useCallback } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { captureWithRetry } from '@/lib/html2canvasRetry';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, Share2, QrCode, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import wiseAiLogo from '@/assets/wise-ai-logo-dark.webp';

import type { QRCustomizationState } from './qr-types';
import { DEFAULT_QR_STATE } from './qr-types';
import { getScannabilityWarnings } from './qr-utils';
import { QRBrandedFrame } from './QRBrandedFrame';

import { TemplatesTab } from './tabs/TemplatesTab';
import { CustomizeTab } from './tabs/CustomizeTab';
import { ExportTab } from './tabs/ExportTab';

interface QRGeneratorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioUrl: string;
  displayUrl: string;
  onShare: () => void;
}

const PREVIEW_SIZE = typeof window !== 'undefined' && window.innerWidth < 360 ? 200 : 240;

/** Build qr-code-styling options from our state */
function buildQROptions(state: QRCustomizationState, size: number) {
  const dotsGradient = state.gradient.enabled
    ? {
        type: state.gradient.type as 'linear' | 'radial',
        rotation: ((state.gradient.angle || 0) * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: state.gradient.from },
          { offset: 1, color: state.gradient.to },
        ],
      }
    : undefined;

  const eyeOuterColor = state.eyes.syncWithForeground
    ? state.foregroundColor
    : state.eyes.outerColor;
  const eyeInnerColor = state.eyes.syncWithForeground
    ? state.foregroundColor
    : state.eyes.innerColor;

  return {
    width: size,
    height: size,
    type: 'svg' as const,
    data: state.data,
    image: state.logo.enabled ? state.logo.src : undefined,
    margin: state.options.quietZone,
    qrOptions: {
      errorCorrectionLevel: state.options.errorCorrection,
    },
    imageOptions: {
      hideBackgroundDots: state.logo.safeZone,
      imageSize: state.logo.sizePercent / 100,
      margin: 4,
      crossOrigin: 'anonymous' as const,
    },
    dotsOptions: {
      type: state.moduleStyle.shape,
      ...(dotsGradient ? { gradient: dotsGradient } : { color: state.foregroundColor }),
    },
    cornersSquareOptions: {
      type: state.eyes.shape,
      color: eyeOuterColor,
    },
    cornersDotOptions: {
      type: state.eyes.innerShape,
      color: eyeInnerColor,
    },
    backgroundOptions: {
      color: state.backgroundColor,
    },
  };
}

export function QRGeneratorSheet({ open, onOpenChange, portfolioUrl, onShare }: QRGeneratorSheetProps) {
  const prefersReduced = useReducedMotion();
  const qrRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState('templates');

  const [state, setState] = useState<QRCustomizationState>(() => ({
    ...DEFAULT_QR_STATE,
    data: portfolioUrl || '',
    templateId: 'wiseresume',
    foregroundColor: '#a855f7',
    backgroundColor: '#18181b',
    gradient: { enabled: true, type: 'radial', from: '#a855f7', to: '#ec4899', angle: 0 },
    moduleStyle: { shape: 'rounded', roundness: 0.6 },
    logo: { src: wiseAiLogo, enabled: true, sizePercent: 25, safeZone: true },
    eyes: { shape: 'extra-rounded', innerShape: 'dot', outerColor: '#a855f7', innerColor: '#ec4899', syncWithForeground: false },
    options: { errorCorrection: 'H', sizePx: 1024, quietZone: 6, format: 'png' },
  }));

  useEffect(() => {
    if (portfolioUrl) setState((prev) => ({ ...prev, data: portfolioUrl }));
  }, [portfolioUrl]);

  const handleChange = useCallback((partial: Partial<QRCustomizationState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      // Always enforce logo + error correction
      next.logo = { ...next.logo, src: wiseAiLogo, enabled: true };
      next.options = { ...next.options, errorCorrection: 'H' };
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const frameId = requestAnimationFrame(() => {
      if (!qrRef.current) return;
      const options = buildQROptions(state, PREVIEW_SIZE);
      if (!qrCodeRef.current) {
        qrCodeRef.current = new QRCodeStyling(options);
        qrRef.current.innerHTML = '';
        qrCodeRef.current.append(qrRef.current);
      } else {
        qrCodeRef.current.update(options);
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [open, state]);

  useEffect(() => {
    if (!open) qrCodeRef.current = null;
  }, [open]);

  const warnings = getScannabilityWarnings(state);

  const handleDownload = async () => {
    haptics.light();
    if (!captureRef.current) return;

    if (state.options.format === 'png') {
      try {
        const canvas = await captureWithRetry(captureRef.current, {
          backgroundColor: null,
          scale: state.options.sizePx / PREVIEW_SIZE,
        });
        const link = document.createElement('a');
        link.download = 'wiseresume-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('QR code downloaded as PNG!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Capture failed';
        toast.error(msg, { action: { label: 'Retry', onClick: () => handleDownload() } });
      }
    } else {
      // SVG fallback — download QR only
      if (qrCodeRef.current) {
        qrCodeRef.current.download({ name: 'wiseresume-qr', extension: 'svg' });
        toast.success('QR code downloaded as SVG!');
      }
    }
  };

  const TABS = [
    { id: 'templates', label: '🎨', title: 'Templates' },
    { id: 'customize', label: '🎛️', title: 'Customize' },
    { id: 'export', label: '📥', title: 'Export' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] flex flex-col p-0 rounded-t-3xl"
        hideCloseButton={false}
      >
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle className="text-center flex items-center justify-center gap-2 text-base">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Studio
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Live Preview + Branded Frame */}
          <div className="flex flex-col items-center gap-1 px-4 py-3">
            <div
              ref={captureRef}
              className={`flex flex-col items-center rounded-2xl p-3 transition-colors ${
                previewBg === 'dark' ? 'bg-zinc-900' : 'bg-white'
              }`}
              style={{ minWidth: PREVIEW_SIZE + 24 }}
            >
              <div ref={qrRef} className="rounded-xl overflow-hidden" />
              <QRBrandedFrame isCapture />
            </div>

            <AnimatePresence>
              {warnings.length > 0 && (
                <motion.div
                  initial={prefersReduced ? {} : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-[300px]"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-amber-300/80 leading-tight">{w.message}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
            <TabsList className="w-full flex justify-center gap-0 bg-transparent p-0 h-auto mb-3">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary min-w-[60px]"
                >
                  <span className="text-base">{t.label}</span>
                  <span className="text-[10px] font-medium">{t.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="pb-4">
              <TabsContent value="templates" className="mt-0">
                <TemplatesTab state={state} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="customize" className="mt-0">
                <CustomizeTab state={state} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="export" className="mt-0">
                <ExportTab
                  state={state}
                  onChange={handleChange}
                  previewBg={previewBg}
                  onPreviewBgChange={setPreviewBg}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Sticky bottom bar */}
        <div className="shrink-0 border-t border-border/20 bg-background/80 backdrop-blur-md px-4 py-3 pb-safe flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl active:scale-95 touch-manipulation font-medium"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl active:scale-95 touch-manipulation font-medium"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
