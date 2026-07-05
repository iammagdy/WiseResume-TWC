import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useIsDark } from '@/hooks/useIsDark';

interface StickyHeaderProps {
  name: string | null;
  avatarUrl: string | null;
  initials: string;
  accentColor: string;
  visible: boolean;
  pStyle?: string;
}

export function StickyHeader({ name, avatarUrl, initials, accentColor, visible, pStyle = 'minimal' }: StickyHeaderProps) {
  const isDark = useIsDark();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 relative pf-sticky-header ${visible ? 'pf-sticky-visible' : ''}`}
      data-pdf-exclude
      style={{
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <GlassSurface className="absolute inset-0" />
      <div className="relative z-[1] flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar className="w-8 h-8 border" style={{ borderColor: accentColor }}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs font-bold" style={{ background: accentColor, color: '#fff' }}>{initials}</AvatarFallback>
        </Avatar>
        <span className="flex-1 min-w-0 truncate font-semibold text-sm" style={{ color: isDark ? 'var(--pf-fg, #f5f5ff)' : '#111827', fontFamily: 'var(--pf-heading-font)' }}>
          {name || 'Portfolio'}
        </span>
      </div>
      </div>
    </div>
  );
}
