import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsDark } from '@/hooks/useIsDark';

interface StickyHeaderProps {
  name: string | null;
  avatarUrl: string | null;
  initials: string;
  contactEmail: string | null;
  accentColor: string;
  visible: boolean;
  pStyle?: string;
}

export function StickyHeader({ name, avatarUrl, initials, contactEmail, accentColor, visible, pStyle = 'minimal' }: StickyHeaderProps) {
  const isDark = useIsDark();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 pf-sticky-header ${visible ? 'pf-sticky-visible' : ''}`}
      data-pdf-exclude
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.92)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="w-8 h-8 border" style={{ borderColor: accentColor }}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs font-bold" style={{ background: accentColor, color: '#fff' }}>{initials}</AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm" style={{ color: isDark ? 'var(--pf-fg, #f5f5ff)' : '#111827', fontFamily: 'var(--pf-heading-font)' }}>
          {name || 'Portfolio'}
        </span>
      </div>
      {contactEmail && (
        <a href={`mailto:${contactEmail}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-85"
          style={{ background: accentColor, color: '#fff' }}>
          Get in Touch
        </a>
      )}
    </div>
  );
}
