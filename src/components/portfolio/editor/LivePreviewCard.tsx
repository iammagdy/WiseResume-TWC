import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getThemeById } from '@/lib/portfolioThemes';
import { Eye } from 'lucide-react';
import type { ScrollEffect } from '@/components/portfolio/editor/ScrollEffectPicker';

const SCROLL_EFFECT_LABELS: Record<ScrollEffect, string> = {
  fade: 'Smooth Fade',
  parallax: 'Parallax Drift',
  'tilt-3d': '3D Tilt Cards',
  cinematic: 'Cinematic Reveal',
};

interface LivePreviewCardProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  portfolioStyle: string;
  accentColor: string;
  portfolioFont: string;
  bio?: string;
  openToWork?: boolean;
  availabilityStatus?: 'actively-looking' | 'open-to-offers' | 'not-looking';
  views?: number;
  scrollEffect?: ScrollEffect;
}

const AVAILABILITY_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'actively-looking': { label: 'Actively Looking', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'open-to-offers': { label: 'Open to Offers', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'not-looking': { label: '', color: '', bg: '', border: '' },
};

export function LivePreviewCard({ avatarUrl, fullName, jobTitle, portfolioStyle, accentColor, portfolioFont, bio, openToWork, availabilityStatus, views, scrollEffect }: LivePreviewCardProps) {
  const initials = fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const vars = useMemo(() => {
    const theme = getThemeById(portfolioStyle);
    const fontFamilies: Record<string, string> = {
      'inter': 'Inter, system-ui, sans-serif',
      'space-grotesk': '"Space Grotesk", Inter, system-ui, sans-serif',
      'serif': 'Georgia, "Times New Roman", serif',
    };

    const bg = theme?.colors.bg || '#0a0a14';
    const fg = theme?.colors.fg || '#f5f5ff';
    const muted = theme?.colors.muted || '#9ca3af';
    const font = theme
      ? theme.typography.headingFont
      : (fontFamilies[portfolioFont] || fontFamilies['inter']);

    return { bg, fg, muted, font } as const;
  }, [portfolioStyle, portfolioFont]);

  const bioSnippet = bio && bio.length > 80 ? bio.slice(0, 80) + '…' : bio;

  const effectiveStatus = availabilityStatus ?? (openToWork ? 'actively-looking' : 'not-looking');
  const badge = AVAILABILITY_BADGE[effectiveStatus];

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border"
      style={{ background: vars.bg, padding: '1rem', maxWidth: '100%' }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 20%, transparent), transparent)` }}
      />
      <div className="relative flex flex-col items-center text-center gap-2 py-3">
        <div className="relative">
          <div className="absolute inset-[-3px] rounded-full opacity-40" style={{ background: `conic-gradient(${accentColor}, transparent, ${accentColor})` }} />
          <Avatar className="h-14 w-14 relative z-10 border-2" style={{ borderColor: accentColor }}>
            <AvatarFallback className="text-sm font-black" style={{ background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, purple))`, color: '#fff' }}>
              {initials}
            </AvatarFallback>
            <AvatarImage src={avatarUrl || undefined} />
          </Avatar>
        </div>
        <h4 className="text-sm font-black leading-tight" style={{ fontFamily: vars.font, color: vars.fg }}>
          {fullName || 'Your Name'}
        </h4>
        {jobTitle && (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{
            background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
            color: accentColor,
            border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
          }}>
            {jobTitle}
          </span>
        )}
        {bioSnippet && (
          <p className="text-[10px] leading-relaxed max-w-[220px] line-clamp-2" style={{ color: vars.muted }}>
            {bioSnippet}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
          {badge.label && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: badge.color }} />
              {badge.label}
            </span>
          )}
          {typeof views === 'number' && views > 0 && (
            <span className="text-[9px] flex items-center gap-0.5" style={{ color: vars.muted }}>
              <Eye className="w-2.5 h-2.5" />
              {views}
            </span>
          )}
        </div>
        {scrollEffect && scrollEffect !== 'fade' && (
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-medium mt-0.5"
            style={{
              background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
              color: accentColor,
              border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
            }}
          >
            ✦ {SCROLL_EFFECT_LABELS[scrollEffect]}
          </span>
        )}
      </div>
    </div>
  );
}
