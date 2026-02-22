import React from 'react';
import { Palette, Type, Layout, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard, SubSectionHeading } from './shared';
import { ThemeStorePicker } from './ThemeStorePicker';
import { PORTFOLIO_THEMES } from '@/lib/portfolioThemes';
import { haptics } from '@/lib/haptics';

export type PortfolioStyle = 'minimal' | 'bold-dark' | 'glass-pro' | 'classic-clean' | 'developer-terminal' | 'creative-spotlight' | 'executive-suite' | 'freelancer-starter' | 'neon-cyber';
export type PortfolioLayout = 'single' | 'two-col';
export type PortfolioFont = 'inter' | 'space-grotesk' | 'serif';

export const ACCENT_PRESETS = [
  '#e84545', '#6366f1', '#0ea5e9', '#10b981',
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
];

// Keep THEMES export for backward compat (LivePreviewCard etc.)
export const THEMES = PORTFOLIO_THEMES.map(t => ({
  id: t.id as PortfolioStyle,
  name: t.name,
  desc: t.description,
  preview: t.preview,
}));

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

  const currentTheme = PORTFOLIO_THEMES.find(t => t.id === portfolioStyle);

  return (
    <CollapsibleCard
      id="appearance"
      icon={<Palette className="w-4 h-4" />}
      title="Appearance"
      hint={<Badge variant="outline" className="text-[10px] py-0 px-1.5">{currentTheme?.name || 'Minimal'}</Badge>}
      openSections={openSections}
      toggleSection={toggleSection}
    >
      {/* Theme Store Picker */}
      <ThemeStorePicker
        selectedThemeId={portfolioStyle}
        onSelectTheme={(id) => onPortfolioStyleChange(id as PortfolioStyle)}
        userAccent={portfolioAccentColor}
      />
      {currentTheme && (
        <p className="text-xs text-muted-foreground">{currentTheme.description}</p>
      )}

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
