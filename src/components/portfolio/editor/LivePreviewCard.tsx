import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getThemeById } from '@/lib/portfolioThemes';

interface LivePreviewCardProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  portfolioStyle: string;
  accentColor: string;
  portfolioFont: string;
}

export function LivePreviewCard({ avatarUrl, fullName, jobTitle, portfolioStyle, accentColor, portfolioFont }: LivePreviewCardProps) {
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

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border/50"
      style={{ background: vars.bg, padding: '1rem', maxWidth: '100%' }}
    >
      <div className="absolute top-1.5 right-2 text-[9px] font-mono uppercase tracking-wider opacity-40" style={{ color: vars.muted }}>
        Preview
      </div>
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
      </div>
    </div>
  );
}
