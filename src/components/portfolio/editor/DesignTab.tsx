import { Palette, Type, Layout, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeStorePicker } from './ThemeStorePicker';
import { PORTFOLIO_THEMES } from '@/lib/portfolioThemes';
import { haptics } from '@/lib/haptics';
import type { PortfolioStyle, PortfolioFont, PortfolioLayout } from './AppearanceSection';
import { ACCENT_PRESETS } from './AppearanceSection';

export interface DesignTabProps {
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

export function DesignTab(props: DesignTabProps) {
  const {
    portfolioStyle, onPortfolioStyleChange,
    portfolioAccentColor, onPortfolioAccentColorChange,
    portfolioFont, onPortfolioFontChange,
    portfolioLayout, onPortfolioLayoutChange,
    selectedTheme, onSelectedThemeChange,
  } = props;

  const currentTheme = PORTFOLIO_THEMES.find(t => t.id === portfolioStyle);

  return (
    <div className="space-y-5">
      {/* Theme Store Picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Theme</label>
        <ThemeStorePicker
          selectedThemeId={portfolioStyle}
          onSelectTheme={(id) => onPortfolioStyleChange(id as PortfolioStyle)}
          userAccent={portfolioAccentColor}
        />
        {currentTheme && (
          <p className="text-[11px] text-muted-foreground">{currentTheme.description}</p>
        )}
      </div>

      {/* Accent Color */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Palette className="w-3.5 h-3.5" />
          Accent Color
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_PRESETS.map(color => (
            <button
              key={color}
              onClick={() => { haptics.light(); onPortfolioAccentColorChange(color); }}
              className="w-8 h-8 rounded-full transition-all active:scale-90 min-w-[32px] min-h-[32px]"
              style={{
                background: color,
                outline: portfolioAccentColor === color ? `3px solid ${color}` : '3px solid transparent',
                outlineOffset: '2px',
              }}
              title={color}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={portfolioAccentColor}
              onChange={e => onPortfolioAccentColorChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
              title="Custom color"
            />
            <div
              className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground"
              style={{ background: ACCENT_PRESETS.includes(portfolioAccentColor) ? 'transparent' : portfolioAccentColor }}
            >
              {ACCENT_PRESETS.includes(portfolioAccentColor) ? '+' : ''}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono">{portfolioAccentColor}</p>
      </div>

      {/* Font Style */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Type className="w-3.5 h-3.5" />
          Font Style
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'inter', label: 'Sans', sample: 'Aa', font: 'Inter' },
            { id: 'space-grotesk', label: 'Display', sample: 'Aa', font: 'Space Grotesk' },
            { id: 'serif', label: 'Serif', sample: 'Aa', font: 'Georgia' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => { haptics.light(); onPortfolioFontChange(f.id); }}
              className={`py-3 px-2 rounded-xl border text-center transition-all active:scale-95 min-h-[44px] ${
                portfolioFont === f.id ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <p className="text-base" style={{ fontFamily: f.font }}>{f.sample}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Layout className="w-3.5 h-3.5" />
          Desktop Layout
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'single', label: 'Single Column', icon: '▌' },
            { id: 'two-col', label: 'Two Column', icon: '▌▌' },
          ] as const).map(l => (
            <button
              key={l.id}
              onClick={() => { haptics.light(); onPortfolioLayoutChange(l.id); }}
              className={`py-3 px-4 rounded-xl border text-center transition-all active:scale-95 min-h-[44px] ${
                portfolioLayout === l.id ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <p className="text-base font-mono">{l.icon}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l.label}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Mobile is always single column.</p>
      </div>

      {/* Page Color Mode */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Eye className="w-3.5 h-3.5" />
          Page Color Mode
        </div>
        <p className="text-[11px] text-muted-foreground">Overrides system dark/light preference for visitors.</p>
        <Select value={selectedTheme} onValueChange={onSelectedThemeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">Follow Visitor's System</SelectItem>
            <SelectItem value="dark">Always Dark</SelectItem>
            <SelectItem value="light">Always Light</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
