import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getThemeById } from '@/lib/portfolioThemes';
import { Eye } from 'lucide-react';

interface LivePreviewCardProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  portfolioStyle: string;
  accentColor: string;
  portfolioFont: string;
  bio?: string;
  openToWork?: boolean;
  views?: number;
}

export function LivePreviewCard({ avatarUrl, fullName, jobTitle, portfolioStyle, accentColor, portfolioFont, bio, openToWork, views }: LivePreviewCardProps) {
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

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border/50"
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
        <div className="flex items-center gap-3 mt-1">
          {openToWork && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              Open to Work
            </span>
          )}
          {typeof views === 'number' && views > 0 && (
            <span className="text-[9px] flex items-center gap-0.5" style={{ color: vars.muted }}>
              <Eye className="w-2.5 h-2.5" />
              {views}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
