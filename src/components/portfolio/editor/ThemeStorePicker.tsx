import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PORTFOLIO_THEMES, type ThemeCategory } from '@/lib/portfolioThemes';
import { haptics } from '@/lib/haptics';
import { Badge } from '@/components/ui/badge';

const CATEGORIES: { id: ThemeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'developer', label: 'Developer' },
  { id: 'creative', label: 'Creative' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'freelancer', label: 'Freelancer' },
];

function ThemeStoreCard({
  theme,
  selected,
  userAccent,
  onSelect,
}: {
  theme: typeof PORTFOLIO_THEMES[0];
  selected: boolean;
  userAccent: string;
  onSelect: () => void;
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
      <div className="h-28 p-3 space-y-2 relative" style={{ background: theme.preview.bg }}>
        {/* Hero area */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: accent }} />
          <div className="flex-1 space-y-1">
            <div className="h-2 rounded-full w-3/4" style={{ background: theme.preview.text, opacity: 0.8 }} />
            <div className="h-1.5 rounded-full w-1/2" style={{ background: accent, opacity: 0.6 }} />
          </div>
        </div>
        {/* Cards preview */}
        <div className="flex gap-1.5">
          <div className="flex-1 h-10 rounded-lg p-1.5 space-y-1" style={{ background: theme.preview.card }}>
            <div className="h-1.5 rounded-full w-4/5" style={{ background: theme.preview.text, opacity: 0.5 }} />
            <div className="h-1 rounded-full w-3/5" style={{ background: theme.preview.text, opacity: 0.3 }} />
            <div className="h-1 rounded-full w-2/5" style={{ background: accent, opacity: 0.4 }} />
          </div>
          <div className="flex-1 h-10 rounded-lg p-1.5 space-y-1" style={{ background: theme.preview.card }}>
            <div className="h-1.5 rounded-full w-3/5" style={{ background: theme.preview.text, opacity: 0.5 }} />
            <div className="h-1 rounded-full w-4/5" style={{ background: theme.preview.text, opacity: 0.3 }} />
            <div className="h-1 rounded-full w-1/3" style={{ background: accent, opacity: 0.4 }} />
          </div>
        </div>
        {/* Skill pills */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="h-2.5 rounded-full"
              style={{
                background: `color-mix(in srgb, ${accent} 20%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                width: i === 0 ? '24%' : i === 1 ? '18%' : i === 2 ? '20%' : '16%',
              }}
            />
          ))}
        </div>

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
}

export function ThemeStorePicker({ selectedThemeId, onSelectTheme, userAccent }: ThemeStorePickerProps) {
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>('all');

  const filteredThemes = activeCategory === 'all'
    ? PORTFOLIO_THEMES
    : PORTFOLIO_THEMES.filter(t => t.category === activeCategory || t.category === 'all');

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
          />
        ))}
      </div>
    </div>
  );
}
