import React from 'react';
import { Palette, Type, Layout, Eye, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard, SubSectionHeading } from './shared';
import { haptics } from '@/lib/haptics';

export type PortfolioStyle = 'minimal' | 'bold-dark' | 'glass-pro' | 'classic-clean';
export type PortfolioLayout = 'single' | 'two-col';
export type PortfolioFont = 'inter' | 'space-grotesk' | 'serif';

export const THEMES: { id: PortfolioStyle; name: string; desc: string; preview: { bg: string; accent: string; card: string; text: string } }[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Clean & spacious. Works for everyone.',
    preview: { bg: '#0a0a14', accent: '#e84545', card: 'rgba(255,255,255,0.05)', text: '#f5f5ff' },
  },
  {
    id: 'bold-dark',
    name: 'Bold Dark',
    desc: 'High contrast with glow cards.',
    preview: { bg: '#0a0a0f', accent: '#e84545', card: 'rgba(255,255,255,0.03)', text: '#f8f8ff' },
  },
  {
    id: 'glass-pro',
    name: 'Glass Pro',
    desc: 'Frosted glass. Modern & polished.',
    preview: { bg: '#0d1117', accent: '#e84545', card: 'rgba(255,255,255,0.08)', text: '#f0f4ff' },
  },
  {
    id: 'classic-clean',
    name: 'Classic Clean',
    desc: 'White, serif-accented. Formal & timeless.',
    preview: { bg: '#ffffff', accent: '#e84545', card: '#f9f9f9', text: '#111827' },
  },
];

export const ACCENT_PRESETS = [
  '#e84545', '#6366f1', '#0ea5e9', '#10b981',
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
];

function ThemePreviewCard({
  theme, selected, accent, onSelect,
}: {
  theme: typeof THEMES[0];
  selected: boolean;
  accent: string;
  onSelect: () => void;
}) {
  const displayAccent = accent || theme.preview.accent;
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl overflow-hidden transition-all shrink-0 w-36 active:scale-[0.97] ${selected ? 'ring-2 ring-offset-2' : 'ring-1 opacity-75 hover:opacity-100'}`}
      style={{
        '--tw-ring-color': selected ? displayAccent : 'rgba(255,255,255,0.1)',
      } as React.CSSProperties}
    >
      <div className="h-20 p-2 space-y-1.5" style={{ background: theme.preview.bg }}>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full" style={{ background: displayAccent }} />
          <div className="flex-1 space-y-0.5">
            <div className="h-1.5 rounded-full w-3/4" style={{ background: theme.preview.text, opacity: 0.8 }} />
            <div className="h-1 rounded-full w-1/2" style={{ background: displayAccent, opacity: 0.8 }} />
          </div>
        </div>
        <div className="h-6 rounded-lg p-1 space-y-0.5" style={{ background: theme.preview.card }}>
          <div className="h-1 rounded-full w-4/5" style={{ background: theme.preview.text, opacity: 0.5 }} />
          <div className="h-1 rounded-full w-3/5" style={{ background: theme.preview.text, opacity: 0.3 }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2 rounded-full px-1 text-[4px]" style={{
              background: `color-mix(in srgb, ${displayAccent} 20%, transparent)`,
              border: `1px solid color-mix(in srgb, ${displayAccent} 35%, transparent)`,
              width: i === 0 ? '28%' : i === 1 ? '22%' : '20%',
            }} />
          ))}
        </div>
      </div>
      <div className="p-2 text-left" style={{ background: 'var(--card)' }}>
        <p className="text-xs font-bold text-foreground truncate">{theme.name}</p>
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: displayAccent }}>
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  );
}

export interface AppearanceSectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  portfolioStyle: PortfolioStyle;
  onPortfolioStyleChange: (val: PortfolioStyle) => void;
  portfolioAccentColor: string;
  onPortfolioAccentColorChange: (val: string) => void;
  portfolioFont: PortfolioFont;
  onPortfolioFontChange: (val: PortfolioFont) => void;
  portfolioLayout: PortfolioLayout;
  onPortfolioLayoutChange: (val: PortfolioLayout) => void;
  selectedTheme: string;
  onSelectedThemeChange: (val: string) => void;
}

export function AppearanceSection(props: AppearanceSectionProps) {
  const {
    openSections, toggleSection, portfolioStyle, onPortfolioStyleChange,
    portfolioAccentColor, onPortfolioAccentColorChange, portfolioFont,
    onPortfolioFontChange, portfolioLayout, onPortfolioLayoutChange,
    selectedTheme, onSelectedThemeChange,
  } = props;

  return (
    <CollapsibleCard
      id="appearance"
      icon={<Palette className="w-4 h-4" />}
      title="Appearance"
      hint={<Badge variant="outline" className="text-[10px] py-0 px-1.5">{THEMES.find(t => t.id === portfolioStyle)?.name || 'Minimal'}</Badge>}
      openSections={openSections}
      toggleSection={toggleSection}
    >
      {/* Theme picker */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {THEMES.map(theme => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            selected={portfolioStyle === theme.id}
            accent={portfolioAccentColor}
            onSelect={() => { haptics.light(); onPortfolioStyleChange(theme.id); }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {THEMES.find(t => t.id === portfolioStyle)?.desc}
      </p>

      {/* Accent Color */}
      <SubSectionHeading icon={<Palette className="w-3.5 h-3.5" />} label="Accent Color" />
      <div className="flex items-center gap-2 flex-wrap">
        {ACCENT_PRESETS.map(color => (
          <button
            key={color}
            onClick={() => { haptics.light(); onPortfolioAccentColorChange(color); }}
            className="w-8 h-8 rounded-full transition-all active:scale-90"
            style={{ background: color, outline: portfolioAccentColor === color ? `3px solid ${color}` : '3px solid transparent', outlineOffset: '2px' }}
            title={color}
          />
        ))}
        <div className="relative">
          <input type="color" value={portfolioAccentColor} onChange={e => onPortfolioAccentColorChange(e.target.value)} className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer" title="Custom color" />
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground" style={{ background: ACCENT_PRESETS.includes(portfolioAccentColor) ? 'transparent' : portfolioAccentColor }}>
            {ACCENT_PRESETS.includes(portfolioAccentColor) ? '+' : ''}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-mono">{portfolioAccentColor}</p>

      {/* Font Style */}
      <SubSectionHeading icon={<Type className="w-3.5 h-3.5" />} label="Font Style" />
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'inter', label: 'Sans', sample: 'Aa', font: 'Inter' },
          { id: 'space-grotesk', label: 'Display', sample: 'Aa', font: 'Space Grotesk' },
          { id: 'serif', label: 'Serif', sample: 'Aa', font: 'Georgia' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => { haptics.light(); onPortfolioFontChange(f.id); }} className={`py-3 px-2 rounded-xl border text-center transition-all active:scale-95 ${portfolioFont === f.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <p className="text-base" style={{ fontFamily: f.font }}>{f.sample}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{f.label}</p>
          </button>
        ))}
      </div>

      {/* Desktop Layout */}
      <SubSectionHeading icon={<Layout className="w-3.5 h-3.5" />} label="Desktop Layout" />
      <div className="grid grid-cols-2 gap-2">
        {([
          { id: 'single', label: 'Single Column', icon: '▌' },
          { id: 'two-col', label: 'Two Column', icon: '▌▌' },
        ] as const).map(l => (
          <button key={l.id} onClick={() => { haptics.light(); onPortfolioLayoutChange(l.id); }} className={`py-3 px-4 rounded-xl border text-center transition-all active:scale-95 ${portfolioLayout === l.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <p className="text-base font-mono">{l.icon}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{l.label}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Mobile is always single column.</p>

      {/* Page Color Mode */}
      <SubSectionHeading icon={<Eye className="w-3.5 h-3.5" />} label="Page Color Mode" />
      <p className="text-xs text-muted-foreground">Overrides system dark/light preference for visitors.</p>
      <Select value={selectedTheme} onValueChange={onSelectedThemeChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="system">Follow Visitor's System</SelectItem>
          <SelectItem value="dark">Always Dark</SelectItem>
          <SelectItem value="light">Always Light</SelectItem>
        </SelectContent>
      </Select>
    </CollapsibleCard>
  );
}
