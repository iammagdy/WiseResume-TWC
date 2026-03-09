import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PORTFOLIO_THEMES, type ThemeCategory, type PortfolioThemeConfig } from '@/lib/portfolioThemes';
import { haptics } from '@/lib/haptics';
import { Badge } from '@/components/ui/badge';

const CATEGORIES: { id: ThemeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'developer', label: 'Developer' },
  { id: 'creative', label: 'Creative' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'freelancer', label: 'Freelancer' },
];

/* ── Card variant styles for mini-cards ─────────────────────── */

function getMiniCardStyle(
  theme: PortfolioThemeConfig,
  accent: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    background: theme.preview.card,
    borderRadius: theme.layout.cardRadius,
  };

  switch (theme.layout.cardVariant) {
    case 'terminal-window':
      return { ...base, borderRadius: '0.375rem', border: `1px solid ${theme.preview.text}22` };
    case 'glassmorphism':
      return { ...base, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' };
    case 'neon-glow':
      return { ...base, border: `1px solid ${accent}55`, boxShadow: `0 0 8px ${accent}33, inset 0 0 6px ${accent}11` };
    case 'elevated':
      return { ...base, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.04)' };
    case 'bordered':
    default:
      return { ...base, border: `1px solid ${theme.preview.text}15` };
  }
}

/* ── Hero area renderer per heroAlign ───────────────────────── */

function HeroPreview({ theme, accent, userName, userAvatarUrl }: { theme: PortfolioThemeConfig; accent: string; userName?: string; userAvatarUrl?: string }) {
  const isTerminal = theme.layout.cardVariant === 'terminal-window';
  const isNeon = theme.layout.cardVariant === 'neon-glow';
  const isSerif = theme.id === 'classic-clean' || theme.id === 'executive-suite';

  const headingH = isSerif ? 2.5 : 2;
  const subH = 1.5;

  if (theme.layout.heroAlign === 'left') {
    // Terminal & Spotlight — left-aligned, no avatar
    return (
      <div className="flex flex-col gap-1.5 pl-0.5">
        {isTerminal && (
          <div className="flex items-center gap-0.5 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#febc2e' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#28c840' }} />
            <div className="h-1 rounded-full w-8 ml-1" style={{ background: theme.preview.text, opacity: 0.2 }} />
          </div>
        )}
        <div className="h-[2.5px] rounded-full w-3/4" style={{ background: theme.preview.text, opacity: 0.85 }} />
        <div className="h-[1.5px] rounded-full w-1/2" style={{ background: accent, opacity: 0.6 }} />
        <div className="h-[1px] rounded-full w-2/3" style={{ background: theme.preview.text, opacity: 0.3 }} />
      </div>
    );
  }

  if (theme.layout.heroAlign === 'split') {
    // Starter — avatar left, text right
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}88, ${accent})` }}
        />
        <div className="flex-1 space-y-1">
          <div className="h-[2.5px] rounded-full w-4/5" style={{ background: theme.preview.text, opacity: 0.85 }} />
          <div className="h-[1.5px] rounded-full w-3/5" style={{ background: accent, opacity: 0.5 }} />
          {/* CTA button shape */}
          <div
            className="h-3 w-10 mt-1"
            style={{
              background: accent,
              borderRadius: theme.layout.cardRadius,
              opacity: 0.7,
            }}
          />
        </div>
      </div>
    );
  }

  // Center (Minimal, Bold Dark, Glass Pro, Classic Clean, Executive, Neon)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {userName && userAvatarUrl ? (
          <img src={userAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" style={{ boxShadow: isNeon ? `0 0 10px ${accent}66` : 'none' }} />
        ) : userName ? (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[7px] font-black text-white" style={{ background: `linear-gradient(135deg, ${accent}66, ${accent})`, boxShadow: isNeon ? `0 0 10px ${accent}66` : 'none' }}>
            {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${accent}66, ${accent})`,
              boxShadow: isNeon ? `0 0 10px ${accent}66` : theme.id === 'bold-dark' ? `0 0 12px ${accent}44` : 'none',
            }}
          />
        )}
        {isNeon && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ boxShadow: `0 0 14px ${accent}44` }}
          />
        )}
      </div>
      {userName ? (
        <div className="text-[7px] font-bold truncate max-w-[80%] text-center" style={{ color: theme.preview.text, opacity: 0.85 }}>
          {userName}
        </div>
      ) : (
        <div
          className="rounded-full w-3/5"
          style={{ height: `${headingH}px`, background: theme.preview.text, opacity: 0.85 }}
        />
      )}
      <div
        className="rounded-full w-2/5"
        style={{
          height: `${subH}px`,
          background: accent,
          opacity: 0.55,
        }}
      />
    </div>
  );
}

/* ── Cards section per variant ──────────────────────────────── */

function CardsPreview({ theme, accent }: { theme: PortfolioThemeConfig; accent: string }) {
  const isTerminal = theme.layout.cardVariant === 'terminal-window';
  const cardStyle = getMiniCardStyle(theme, accent);
  const isExec = theme.id === 'executive-suite';

  return (
    <div className="flex gap-1.5">
      {[0, 1].map(i => (
        <div key={i} className="flex-1 p-1.5 space-y-1 overflow-hidden" style={{ ...cardStyle, height: isTerminal ? 'auto' : undefined }}>
          {/* Terminal dots on each card */}
          {isTerminal && (
            <div className="flex items-center gap-[2px] mb-0.5">
              <div className="w-1 h-1 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-1 h-1 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-1 h-1 rounded-full" style={{ background: '#28c840' }} />
            </div>
          )}
          {/* Executive thin rule */}
          {isExec && (
            <div className="h-[0.5px] w-full mb-0.5" style={{ background: theme.preview.text, opacity: 0.15 }} />
          )}
          <div
            className="rounded-full"
            style={{
              height: '1.5px',
              width: i === 0 ? '80%' : '60%',
              background: theme.preview.text,
              opacity: 0.5,
            }}
          />
          <div
            className="rounded-full"
            style={{
              height: '1px',
              width: i === 0 ? '60%' : '80%',
              background: theme.preview.text,
              opacity: 0.3,
            }}
          />
          <div
            className="rounded-full"
            style={{
              height: '1px',
              width: i === 0 ? '40%' : '33%',
              background: accent,
              opacity: 0.4,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Skill pills ────────────────────────────────────────────── */

function SkillPillsPreview({ theme, accent }: { theme: PortfolioThemeConfig; accent: string }) {
  const isNeon = theme.layout.cardVariant === 'neon-glow';

  return (
    <div className="flex gap-1">
      {[24, 18, 20, 16].map((w, i) => (
        <div
          key={i}
          className="h-2.5 rounded-full"
          style={{
            width: `${w}%`,
            background: isNeon
              ? `${accent}22`
              : `color-mix(in srgb, ${accent} 20%, transparent)`,
            border: isNeon
              ? `1px solid ${accent}55`
              : `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
            boxShadow: isNeon ? `0 0 4px ${accent}22` : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ── Main ThemeStoreCard ────────────────────────────────────── */

function ThemeStoreCard({
  theme,
  selected,
  userAccent,
  onSelect,
  userName,
  userAvatarUrl,
}: {
  theme: PortfolioThemeConfig;
  selected: boolean;
  userAccent: string;
  onSelect: () => void;
  userName?: string;
  userAvatarUrl?: string;
}) {
  const accent = userAccent || theme.preview.accent;

  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl overflow-hidden transition-all active:scale-[0.97] text-left ${
        selected
          ? 'ring-2 ring-offset-2 ring-offset-background'
          : 'ring-1 ring-border/40 opacity-80 hover:opacity-100'
      }`}
      style={{ '--tw-ring-color': selected ? accent : undefined } as React.CSSProperties}
    >
      {/* Mini preview */}
      <div
        className="h-28 p-3 space-y-2 relative overflow-hidden"
        style={{
          background: theme.preview.heroGradient || theme.preview.bg,
        }}
      >
        {/* Neon scanline overlay */}
        {theme.layout.cardVariant === 'neon-glow' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${accent}06 3px, ${accent}06 4px)`,
            }}
          />
        )}

        {/* Glass Pro frosted overlay */}
        {theme.layout.cardVariant === 'glassmorphism' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Bold Dark radial glow */}
        {theme.id === 'bold-dark' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${accent}18 0%, transparent 60%)`,
            }}
          />
        )}

        <HeroPreview theme={theme} accent={accent} userName={userName} userAvatarUrl={userAvatarUrl} />
        <CardsPreview theme={theme} accent={accent} />
        <SkillPillsPreview theme={theme} accent={accent} />

        {/* NEW badge */}
        {theme.isNew && (
          <div className="absolute top-2 right-2">
            <Badge className="text-[8px] py-0 px-1.5 gap-0.5 bg-primary/90 text-primary-foreground border-0">
              <Sparkles className="w-2 h-2" />
              NEW
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 bg-card border-t border-border/30">
        <p className="text-xs font-bold text-foreground truncate">{theme.name}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{theme.description}</p>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div
          className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: accent }}
        >
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

interface ThemeStorePickerProps {
  selectedThemeId: string;
  onSelectTheme: (id: string) => void;
  userAccent: string;
  userName?: string;
  userAvatarUrl?: string;
}

export function ThemeStorePicker({ selectedThemeId, onSelectTheme, userAccent, userName, userAvatarUrl }: ThemeStorePickerProps) {
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>('all');

  const filteredThemes = activeCategory === 'all'
    ? PORTFOLIO_THEMES
    : PORTFOLIO_THEMES.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { haptics.light(); setActiveCategory(cat.id); }}
            className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredThemes.map(theme => (
          <ThemeStoreCard
            key={theme.id}
            theme={theme}
            selected={selectedThemeId === theme.id}
            userAccent={userAccent}
            onSelect={() => { haptics.light(); onSelectTheme(theme.id); }}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
          />
        ))}
      </div>
    </div>
  );
}
