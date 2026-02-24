import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { captureWithRetry } from '@/lib/html2canvasRetry';
import { downloadFile } from '@/lib/downloadUtils';
import type { AnswerScore } from '@/hooks/useVoiceInterview';

type CardVariant = 'cosmic' | 'clean';

interface InterviewResultsCardSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  overallScore: number | null;
  duration: number;
  scores: AnswerScore[];
}

/* ── variant styles ── */
function getVariantStyles(variant: CardVariant) {
  if (variant === 'cosmic') {
    return {
      bg: 'background: linear-gradient(135deg, #0f0c29 0%, #1a1a40 40%, #302b63 70%, #24243e 100%)',
      text: '#e2e0f0',
      muted: '#9b97b8',
      accent: '#a78bfa',
      scoreBorder: '#a78bfa',
      pill: 'rgba(167,139,250,0.15)',
      pillBorder: 'rgba(167,139,250,0.3)',
      pillText: '#c4b5fd',
      footer: '#6b668a',
      dark: true,
    };
  }
  return {
    bg: 'background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 50%, #e8e6f0 100%)',
    text: '#1a1a2e',
    muted: '#64607a',
    accent: '#7c3aed',
    scoreBorder: '#7c3aed',
    pill: 'rgba(124,58,237,0.08)',
    pillBorder: 'rgba(124,58,237,0.2)',
    pillText: '#6d28d9',
    footer: '#9b97b8',
    dark: false,
  };
}

function scoreColor(score: number, variant: CardVariant) {
  const s = getVariantStyles(variant);
  if (score >= 8) return { ring: '#22c55e', text: '#22c55e' };
  if (score >= 5) return { ring: '#eab308', text: '#eab308' };
  return { ring: '#ef4444', text: '#ef4444' };
}

/* ── off-screen canvas card ── */
function ResultsCardCanvas({
  cardRef,
  variant,
  overallScore,
  duration,
  scores,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  variant: CardVariant;
  overallScore: number | null;
  duration: number;
  scores: AnswerScore[];
}) {
  const s = getVariantStyles(variant);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const sc = overallScore !== null ? scoreColor(overallScore, variant) : null;
  const topScores = scores.slice(0, 3);

  return (
    <div
      ref={cardRef}
      style={{
        width: 1200,
        height: 630,
        position: 'absolute',
        left: -9999,
        top: 0,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          ...(Object.fromEntries(s.bg.split(';').map(p => {
            const [k, ...v] = p.split(':');
            return [k.trim(), v.join(':').trim()];
          }))),
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: s.accent }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: s.text, letterSpacing: '-0.01em' }}>
              WiseResume
            </span>
          </div>
          <span style={{ fontSize: 16, color: s.muted, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
            Mock Interview Results
          </span>
        </div>

        {/* Center – score + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 64, flex: 1, paddingTop: 16, paddingBottom: 16 }}>
          {/* Score circle */}
          {overallScore !== null && sc ? (
            <div style={{
              width: 180, height: 180, borderRadius: '50%', border: `4px solid ${sc.ring}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 72, fontWeight: 800, color: sc.text, lineHeight: 1 }}>{overallScore}</span>
              <span style={{ fontSize: 20, color: s.muted, marginTop: 4 }}>/ 10</span>
            </div>
          ) : (
            <div style={{
              width: 180, height: 180, borderRadius: '50%', border: `3px solid ${s.muted}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 48, color: s.muted }}>—</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <span style={{ fontSize: 14, color: s.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600 }}>Duration</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.text, marginTop: 4 }}>
                  {mins}m {secs.toString().padStart(2, '0')}s
                </div>
              </div>
              <div>
                <span style={{ fontSize: 14, color: s.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600 }}>Answers</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.text, marginTop: 4 }}>
                  {scores.length}
                </div>
              </div>
            </div>

            {/* Top answer pills */}
            {topScores.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                {topScores.map((ts, i) => {
                  const pc = scoreColor(ts.score, variant);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        background: s.pill,
                        border: `1px solid ${s.pillBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 15, color: s.pillText, fontWeight: 600 }}>
                        Q{ts.questionIndex}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: pc.text }}>
                        {ts.score}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: s.footer, fontWeight: 500 }}>✨ Powered by Wiseresume AI</span>
          </div>
          <span style={{ fontSize: 13, color: s.footer }}>wiseresume.ai</span>
        </div>
      </div>
    </div>
  );
}

/* ── main sheet ── */
export function InterviewResultsCardSheet({
  open,
  onOpenChange,
  overallScore,
  duration,
  scores,
}: InterviewResultsCardSheetProps) {
  const [variant, setVariant] = useState<CardVariant>('cosmic');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.28);

  useEffect(() => {
    if (!open || !previewRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setPreviewScale(Math.min(w / 1200, 0.45));
    });
    ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [open]);

  const capture = useCallback(async () => {
    if (!cardRef.current) throw new Error('Card not mounted');
    return captureWithRetry(cardRef.current, { scale: 2, backgroundColor: null });
  }, []);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = await capture();
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Blob failed'))), 'image/png'),
      );
      await downloadFile({ blob, fileName: 'interview-results.png', mimeType: 'image/png' });
      toast.success('Card saved!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate card');
    } finally {
      setBusy(false);
    }
  }, [capture]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      toast.info('Share not supported – downloading instead');
      return handleDownload();
    }
    setBusy(true);
    try {
      const canvas = await capture();
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('Blob failed'))), 'image/png'),
      );
      const file = new File([blob], 'interview-results.png', { type: 'image/png' });
      await navigator.share({ files: [file] });
      toast.success('Shared!');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error(e);
        toast.error('Share failed');
      }
    } finally {
      setBusy(false);
    }
  }, [capture, handleDownload]);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const variants: { key: CardVariant; label: string }[] = [
    { key: 'cosmic', label: 'Cosmic' },
    { key: 'clean', label: 'Clean' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col gap-4" hideCloseButton={false}>
        <SheetTitle className="sr-only">Share Interview Results</SheetTitle>

        {/* Variant selector */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {variants.map(v => (
            <button
              key={v.key}
              onClick={() => setVariant(v.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] touch-manipulation',
                variant === v.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Live preview */}
        <div
          ref={previewRef}
          className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center"
          style={{ height: 630 * previewScale + 24 }}
        >
          <div
            style={{
              width: 1200,
              height: 630,
              transform: `scale(${previewScale})`,
              transformOrigin: 'center center',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <ResultsCardCanvas
              cardRef={cardRef}
              variant={variant}
              overallScore={overallScore}
              duration={duration}
              scores={scores}
            />
            {/* Visible preview clone (same content, visible) */}
            <ResultsCardPreview variant={variant} overallScore={overallScore} duration={duration} scores={scores} />
          </div>
        </div>

        {/* Actions */}
        <div className={cn('grid gap-3', canShare ? 'grid-cols-2' : 'grid-cols-1')}>
          <Button
            onClick={handleDownload}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary/80 min-h-[44px]"
          >
            <Download className="w-4 h-4 mr-2" />
            {busy ? 'Generating…' : 'Download'}
          </Button>
          {canShare && (
            <Button variant="outline" onClick={handleShare} disabled={busy} className="min-h-[44px]">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── visible preview (not used for capture) ── */
function ResultsCardPreview({
  variant,
  overallScore,
  duration,
  scores,
}: {
  variant: CardVariant;
  overallScore: number | null;
  duration: number;
  scores: AnswerScore[];
}) {
  const s = getVariantStyles(variant);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const sc = overallScore !== null ? scoreColor(overallScore, variant) : null;
  const topScores = scores.slice(0, 3);

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 56,
        ...(Object.fromEntries(s.bg.split(';').map(p => {
          const [k, ...v] = p.split(':');
          return [k.trim(), v.join(':').trim()];
        }))),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: s.accent }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: s.text, letterSpacing: '-0.01em' }}>WiseResume</span>
        </div>
        <span style={{ fontSize: 16, color: s.muted, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Mock Interview Results</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 64, flex: 1, paddingTop: 16, paddingBottom: 16 }}>
        {overallScore !== null && sc ? (
          <div style={{ width: 180, height: 180, borderRadius: '50%', border: `4px solid ${sc.ring}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 72, fontWeight: 800, color: sc.text, lineHeight: 1 }}>{overallScore}</span>
            <span style={{ fontSize: 20, color: s.muted, marginTop: 4 }}>/ 10</span>
          </div>
        ) : (
          <div style={{ width: 180, height: 180, borderRadius: '50%', border: `3px solid ${s.muted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 48, color: s.muted }}>—</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <span style={{ fontSize: 14, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Duration</span>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.text, marginTop: 4 }}>{mins}m {secs.toString().padStart(2, '0')}s</div>
            </div>
            <div>
              <span style={{ fontSize: 14, color: s.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Answers</span>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.text, marginTop: 4 }}>{scores.length}</div>
            </div>
          </div>
          {topScores.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {topScores.map((ts, i) => {
                const pc = scoreColor(ts.score, variant);
                return (
                  <div key={i} style={{ padding: '8px 16px', borderRadius: 999, background: s.pill, border: `1px solid ${s.pillBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, color: s.pillText, fontWeight: 600 }}>Q{ts.questionIndex}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: pc.text }}>{ts.score}/10</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: s.footer, fontWeight: 500 }}>✨ Powered by Wiseresume AI</span>
        <span style={{ fontSize: 13, color: s.footer }}>wiseresume.ai</span>
      </div>
    </div>
  );
}
