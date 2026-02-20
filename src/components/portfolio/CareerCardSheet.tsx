import { useRef, useState, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Linkedin, Share2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/downloadUtils';
import { haptics } from '@/lib/haptics';
import { getPortfolioUrl, getAppUrl } from '@/lib/portfolioUrl';
// Profile shape (mirrors useProfile internal type)
interface Profile {
  fullName?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  openToWork?: boolean | null;
  username?: string | null;
  portfolioAccentColor?: string | null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CardVariant = 'cosmic' | 'aurora' | 'clean';

interface DatabaseResume {
  id: string;
  title: string;
  skills?: string[] | null;
  experience?: Array<{
    position?: string;
    company?: string;
    achievements?: string[];
  }> | null;
}

interface CareerCardSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
  selectedResume: DatabaseResume | undefined;
  accentColor: string;
}

// ─── Variant configs ──────────────────────────────────────────────────────────

const VARIANTS: { id: CardVariant; label: string; emoji: string }[] = [
  { id: 'cosmic', label: 'Cosmic', emoji: '🌌' },
  { id: 'aurora', label: 'Aurora', emoji: '🌊' },
  { id: 'clean',  label: 'Clean',  emoji: '☀️' },
];

function getVariantStyles(variant: CardVariant, accent: string) {
  const isDark = variant !== 'clean';
  switch (variant) {
    case 'cosmic':
      return {
        background: `radial-gradient(ellipse at 15% 30%, ${accent}28 0%, transparent 60%), linear-gradient(135deg, #0a0a1f 0%, #1a0a2e 50%, #0a0f2e 100%)`,
        textPrimary: '#f5f5ff',
        textMuted: 'rgba(245,245,255,0.55)',
        divider: 'rgba(255,255,255,0.12)',
        chipBg: `${accent}28`,
        chipText: accent,
        badgeBg: `${accent}33`,
        isDark,
      };
    case 'aurora':
      return {
        background: `radial-gradient(ellipse at 80% 10%, #0ea5e940 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, ${accent}25 0%, transparent 50%), linear-gradient(160deg, #0d1117 0%, #0a1628 60%, #0d1a2e 100%)`,
        textPrimary: '#f0f4ff',
        textMuted: 'rgba(240,244,255,0.55)',
        divider: 'rgba(255,255,255,0.10)',
        chipBg: `${accent}25`,
        chipText: accent,
        badgeBg: '#0ea5e933',
        isDark,
      };
    case 'clean':
    default:
      return {
        background: 'linear-gradient(145deg, #ffffff 0%, #f4f7ff 100%)',
        textPrimary: '#111827',
        textMuted: '#6b7280',
        divider: 'rgba(17,24,39,0.10)',
        chipBg: `${accent}18`,
        chipText: accent,
        badgeBg: `${accent}18`,
        isDark: false,
      };
  }
}

// ─── The actual 1200×630 card canvas div (captured by html2canvas) ────────────

const CareerCardCanvas = ({
  cardRef,
  variant,
  accent,
  fullName,
  jobTitle,
  location,
  openToWork,
  avatarUrl,
  topSkills,
  achievement,
  username,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  variant: CardVariant;
  accent: string;
  fullName: string;
  jobTitle: string;
  location: string;
  openToWork: boolean;
  avatarUrl: string | null;
  topSkills: string[];
  achievement: string;
  username: string;
}) => {
  const s = getVariantStyles(variant, accent);

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: '1200px',
    height: '630px',
    background: s.background,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '60px 72px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
  };

  const accentGlowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '400px',
    height: '400px',
    background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)`,
    borderRadius: '50%',
    pointerEvents: 'none',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: s.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
    letterSpacing: '0.02em',
  };

  const dotStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
    borderRadius: '50%',
    display: 'inline-block',
  };

  return (
    <div ref={cardRef} style={cardStyle}>
      {/* Decorative glow */}
      <div style={accentGlowStyle} />

      {/* Top row: branding */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={logoStyle}>
          <span style={dotStyle} />
          WiseResume
        </div>
        {openToWork && (
          <div style={{
            background: '#10b98120',
            border: '1px solid #10b98150',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '999px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            ✦ Open to Work
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flex: 1, marginTop: '36px' }}>

        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              crossOrigin="anonymous"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${accent}`,
              }}
            />
          ) : (
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
              border: `3px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 800,
              color: accent,
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Identity + content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Name + title */}
          <div>
            <div style={{
              fontSize: '52px',
              fontWeight: 800,
              color: s.textPrimary,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}>
              {fullName || 'Your Name'}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 500,
              color: accent,
              marginTop: '6px',
              letterSpacing: '-0.01em',
            }}>
              {jobTitle || 'Professional'}
            </div>
            {location && (
              <div style={{
                fontSize: '15px',
                color: s.textMuted,
                marginTop: '6px',
              }}>
                📍 {location}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', background: s.divider }} />

          {/* Key achievement */}
          {achievement && (
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: s.textMuted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Key Achievement
              </div>
              <div style={{
                fontSize: '19px',
                color: s.textPrimary,
                fontStyle: 'italic',
                lineHeight: 1.45,
                opacity: 0.9,
                maxWidth: '680px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                "{achievement}"
              </div>
            </div>
          )}

          {/* Skills */}
          {topSkills.length > 0 && (
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: s.textMuted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}>
                Top Skills
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {topSkills.slice(0, 5).map((skill) => (
                  <div
                    key={skill}
                    style={{
                      background: s.chipBg,
                      color: s.chipText,
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '7px 16px',
                      borderRadius: '999px',
                      border: `1px solid ${accent}35`,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `1px solid ${s.divider}`,
        paddingTop: '20px',
        marginTop: '16px',
      }}>
        <div style={{ fontSize: '13px', color: s.textMuted, fontWeight: 500 }}>
          Made with <span style={{ color: accent, fontWeight: 700 }}>WiseResume</span>
        </div>
        {username && (
          <div style={{
            fontSize: '13px',
            color: s.textMuted,
            fontFamily: "'Courier New', monospace",
          }}>
            WiseResume/{username}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export function CareerCardSheet({
  open,
  onOpenChange,
  profile,
  selectedResume,
  accentColor,
}: CareerCardSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<CardVariant>('cosmic');
  const [flipClass, setFlipClass] = useState<'' | 'pf-flipping-out' | 'pf-flipping-in'>('');
  const [generating, setGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.285);

  // Derive display data
  const fullName = profile?.fullName || '';
  const jobTitle = profile?.jobTitle || '';
  const location = profile?.location || '';
  const openToWork = profile?.openToWork || false;
  const avatarUrl = profile?.avatarUrl || null;
  const username = profile?.username || '';

  const rawSkills = selectedResume?.skills;
  const topSkills: string[] = Array.isArray(rawSkills)
    ? (rawSkills as unknown[]).slice(0, 5).map(s => String(s))
    : [];

  const exp = selectedResume?.experience;
  const firstExp = Array.isArray(exp) && exp.length > 0 ? exp[0] : null;
  const achievement =
    (firstExp?.achievements && firstExp.achievements.length > 0
      ? firstExp.achievements[0]
      : '') || '';

  // Compute live preview scale
  useEffect(() => {
    if (!open) return;
    const el = previewWrapperRef.current;
    if (!el) return;
    const compute = () => {
      setPreviewScale(el.clientWidth / 1200);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    haptics.medium();
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        width: 1200,
        height: 630,
      });
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          await downloadFile({
            blob,
            fileName: `${(fullName || 'career').replace(/\s+/g, '-').toLowerCase()}-career-card.png`,
            mimeType: 'image/png',
          });
          resolve();
        }, 'image/png', 1.0);
      });
      toast.success('Career Card saved!');
      haptics.success();
    } catch {
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [fullName]);

  const handleShareImage = useCallback(async () => {
    if (!cardRef.current || !navigator.share) return;
    haptics.medium();
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1, useCORS: true, allowTaint: false, backgroundColor: null, logging: false,
        width: 1200, height: 630,
      });
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return; }
          const file = new File([blob], 'career-card.png', { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: `${fullName} — Career Card` });
          }
          resolve();
        }, 'image/png', 1.0);
      });
      haptics.success();
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        toast.error('Could not share. Try downloading instead.');
      }
    } finally {
      setGenerating(false);
    }
  }, [fullName]);

  const handleShareLinkedIn = useCallback(() => {
    haptics.light();
    const portfolioUrl = username
      ? getPortfolioUrl(username)
      : getAppUrl();
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }, [username]);

  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;
  const s = getVariantStyles(variant, accentColor);

  const handleVariantChange = useCallback((newVariant: CardVariant) => {
    if (newVariant === variant || flipClass) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVariant(newVariant); return; }
    setFlipClass('pf-flipping-out');
    setTimeout(() => {
      setVariant(newVariant);
      setFlipClass('pf-flipping-in');
      setTimeout(() => setFlipClass(''), 220);
    }, 220);
  }, [variant, flipClass]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Career Card
          </SheetTitle>
          <SheetDescription>
            Generate a beautiful shareable image from your portfolio
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pt-2 pb-4 max-w-3xl mx-auto w-full">

          {/* Live preview */}
          <div ref={previewWrapperRef} className="pf-card-flip-container w-full max-w-2xl mx-auto rounded-2xl border border-border/40 relative"
            style={{ aspectRatio: '1200/630' }}
          >
            <div
              className={`pf-card-flip-inner ${flipClass}`}
              style={{
                width: '1200px',
                height: '630px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <div style={{
                position: 'relative',
                width: '1200px',
                height: '630px',
                background: s.background,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                padding: '60px 72px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}>
                {/* Glow */}
                <div style={{
                  position: 'absolute', top: '-80px', right: '-80px',
                  width: '400px', height: '400px',
                  background: `radial-gradient(circle, ${accentColor}35 0%, transparent 70%)`,
                  borderRadius: '50%',
                }} />

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: s.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }}>
                    <div style={{ width: '18px', height: '18px', background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, borderRadius: '50%' }} />
                    WiseResume
                  </div>
                  {openToWork && (
                    <div style={{ background: '#10b98120', border: '1px solid #10b98150', color: '#10b981', fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ✦ Open to Work
                    </div>
                  )}
                </div>

                {/* Main */}
                <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flex: 1, marginTop: '36px' }}>
                  {/* Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" crossOrigin="anonymous" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accentColor}` }} />
                    ) : (
                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`, border: `3px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: 800, color: accentColor }}>
                        {fullName.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <div style={{ fontSize: '52px', fontWeight: 800, color: s.textPrimary, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{fullName || 'Your Name'}</div>
                      <div style={{ fontSize: '24px', fontWeight: 500, color: accentColor, marginTop: '6px' }}>{jobTitle || 'Professional'}</div>
                      {location && <div style={{ fontSize: '15px', color: s.textMuted, marginTop: '6px' }}>📍 {location}</div>}
                    </div>
                    <div style={{ width: '100%', height: '1px', background: s.divider }} />
                    {achievement && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: s.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Key Achievement</div>
                        <div style={{ fontSize: '19px', color: s.textPrimary, fontStyle: 'italic', lineHeight: 1.45, opacity: 0.9 }}>"{achievement.slice(0, 120)}{achievement.length > 120 ? '…' : ''}"</div>
                      </div>
                    )}
                    {topSkills.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: s.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Top Skills</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {topSkills.slice(0, 5).map(skill => (
                            <div key={skill} style={{ background: s.chipBg, color: s.chipText, fontSize: '14px', fontWeight: 600, padding: '7px 16px', borderRadius: '999px', border: `1px solid ${accentColor}35` }}>{skill}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${s.divider}`, paddingTop: '20px', marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: s.textMuted, fontWeight: 500 }}>Made with <span style={{ color: accentColor, fontWeight: 700 }}>WiseResume</span></div>
                  {username && <div style={{ fontSize: '13px', color: s.textMuted, fontFamily: 'monospace' }}>WiseResume/{username}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Variant picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Style</p>
            <div className="grid grid-cols-3 gap-2">
              {VARIANTS.map(v => (
                <button
                  key={v.id}
                  onClick={() => { haptics.light(); handleVariantChange(v.id); }}
                  className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation ${
                    variant === v.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border'
                  }`}
                >
                  <span>{v.emoji}</span> {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <Button
              className="w-full h-12 min-h-[44px] rounded-xl active:scale-95 touch-manipulation"
              onClick={handleDownload}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download Image
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-sm"
                onClick={handleShareLinkedIn}
                disabled={generating}
              >
                <Linkedin className="w-4 h-4 mr-1.5" /> LinkedIn
              </Button>
              {canWebShare && (
                <Button
                  variant="outline"
                  className="h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-sm"
                  onClick={handleShareImage}
                  disabled={generating}
                >
                  <Share2 className="w-4 h-4 mr-1.5" /> Share
                </Button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Download the PNG then attach it to your LinkedIn post for best results
          </p>
        </div>

        {/* Hidden off-screen canvas div for html2canvas capture */}
        <CareerCardCanvas
          cardRef={cardRef as React.RefObject<HTMLDivElement>}
          variant={variant}
          accent={accentColor}
          fullName={fullName}
          jobTitle={jobTitle}
          location={location}
          openToWork={openToWork}
          avatarUrl={avatarUrl}
          topSkills={topSkills}
          achievement={achievement}
          username={username}
        />
      </SheetContent>
    </Sheet>
  );
}
