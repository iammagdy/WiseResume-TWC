// Portfolio Theme Registry — all theme configs in one place

export type ThemeCategory = 'all' | 'developer' | 'creative' | 'corporate' | 'freelancer';

export interface PortfolioThemeConfig {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  isNew: boolean;
  colors: {
    bg: string;
    fg: string;
    card: string;
    border: string;
    muted: string;
    accentDefault: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    headingWeight: number;
  };
  layout: {
    heroAlign: 'center' | 'left' | 'split';
    cardRadius: string;
    cardVariant: 'bordered' | 'elevated' | 'terminal-window' | 'glassmorphism' | 'neon-glow';
  };
  animation: 'fade-up' | 'slide-in' | 'scale-pop' | 'terminal-type' | 'neon-pulse';
  preview: {
    bg: string;
    accent: string;
    card: string;
    text: string;
    heroGradient?: string;
  };
}

export const PORTFOLIO_THEMES: PortfolioThemeConfig[] = [
  // ── Existing 4 themes ─────────────────────────────────────────
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean & spacious. Works for everyone.',
    category: 'all',
    isNew: false,
    colors: { bg: '#0a0a14', fg: '#f5f5ff', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', muted: '#9ca3af', accentDefault: '#e84545' },
    typography: { headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'center', cardRadius: '1rem', cardVariant: 'bordered' },
    animation: 'fade-up',
    preview: { bg: '#0a0a14', accent: '#e84545', card: 'rgba(255,255,255,0.05)', text: '#f5f5ff' },
  },
  {
    id: 'bold-dark',
    name: 'Bold Dark',
    description: 'High contrast with glow cards.',
    category: 'developer',
    isNew: false,
    colors: { bg: '#0a0a0f', fg: '#f8f8ff', card: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', muted: '#9ca3af', accentDefault: '#e84545' },
    typography: { headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'center', cardRadius: '1rem', cardVariant: 'bordered' },
    animation: 'scale-pop',
    preview: { bg: '#0a0a0f', accent: '#e84545', card: 'rgba(255,255,255,0.03)', text: '#f8f8ff' },
  },
  {
    id: 'glass-pro',
    name: 'Glass Pro',
    description: 'Frosted glass. Modern & polished.',
    category: 'creative',
    isNew: false,
    colors: { bg: '#0d1117', fg: '#f0f4ff', card: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.1)', muted: '#9ca3af', accentDefault: '#e84545' },
    typography: { headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'center', cardRadius: '1rem', cardVariant: 'glassmorphism' },
    animation: 'fade-up',
    preview: { bg: '#0d1117', accent: '#e84545', card: 'rgba(255,255,255,0.08)', text: '#f0f4ff' },
  },
  {
    id: 'classic-clean',
    name: 'Classic Clean',
    description: 'White, serif-accented. Formal & timeless.',
    category: 'all',
    isNew: false,
    colors: { bg: '#ffffff', fg: '#111827', card: '#f9f9f9', border: '#e5e7eb', muted: '#6b7280', accentDefault: '#e84545' },
    typography: { headingFont: 'Georgia, "Times New Roman", serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 700 },
    layout: { heroAlign: 'center', cardRadius: '1rem', cardVariant: 'bordered' },
    animation: 'fade-up',
    preview: { bg: '#ffffff', accent: '#e84545', card: '#f9f9f9', text: '#111827' },
  },

  // ── 5 New Premium Themes ──────────────────────────────────────
  {
    id: 'developer-terminal',
    name: 'Terminal',
    description: 'Code editor aesthetic. Built for devs.',
    category: 'developer',
    isNew: true,
    colors: { bg: '#1a1b26', fg: '#c0caf5', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', muted: '#565f89', accentDefault: '#9ece6a' },
    typography: { headingFont: '"Fira Code", "JetBrains Mono", monospace', bodyFont: '"Fira Code", monospace', headingWeight: 700 },
    layout: { heroAlign: 'left', cardRadius: '0.75rem', cardVariant: 'terminal-window' },
    animation: 'terminal-type',
    preview: { bg: '#1a1b26', accent: '#9ece6a', card: 'rgba(255,255,255,0.04)', text: '#c0caf5' },
  },
  {
    id: 'creative-spotlight',
    name: 'Spotlight',
    description: 'Bold & editorial. For creatives who stand out.',
    category: 'creative',
    isNew: true,
    colors: { bg: '#faf9f6', fg: '#1a1a2e', card: '#ffffff', border: 'rgba(0,0,0,0.06)', muted: '#6b7280', accentDefault: '#e84545' },
    typography: { headingFont: '"Space Grotesk", Inter, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'left', cardRadius: '1.25rem', cardVariant: 'elevated' },
    animation: 'slide-in',
    preview: { bg: '#faf9f6', accent: '#e84545', card: '#ffffff', text: '#1a1a2e', heroGradient: 'linear-gradient(135deg, #faf9f6 0%, #f0e6ff 50%, #ffe6e6 100%)' },
  },
  {
    id: 'executive-suite',
    name: 'Executive',
    description: 'Refined & professional. Command authority.',
    category: 'corporate',
    isNew: true,
    colors: { bg: '#fefefe', fg: '#0f172a', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', accentDefault: '#1e3a5f' },
    typography: { headingFont: 'Georgia, "Times New Roman", serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 700 },
    layout: { heroAlign: 'center', cardRadius: '0.5rem', cardVariant: 'bordered' },
    animation: 'fade-up',
    preview: { bg: '#fefefe', accent: '#1e3a5f', card: '#ffffff', text: '#0f172a' },
  },
  {
    id: 'freelancer-starter',
    name: 'Starter',
    description: 'Conversion-focused. Land your next client.',
    category: 'freelancer',
    isNew: true,
    colors: { bg: '#ffffff', fg: '#18181b', card: '#ffffff', border: 'rgba(0,0,0,0.08)', muted: '#71717a', accentDefault: '#7c3aed' },
    typography: { headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'split', cardRadius: '1.5rem', cardVariant: 'elevated' },
    animation: 'scale-pop',
    preview: { bg: '#ffffff', accent: '#7c3aed', card: '#f5f3ff', text: '#18181b' },
  },
  {
    id: 'neon-cyber',
    name: 'Neon',
    description: 'Cyberpunk glow. Unforgettable presence.',
    category: 'developer',
    isNew: true,
    colors: { bg: '#0a0a0a', fg: '#e4e4e7', card: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', muted: '#71717a', accentDefault: '#00ffaa' },
    typography: { headingFont: '"Space Grotesk", Inter, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', headingWeight: 800 },
    layout: { heroAlign: 'center', cardRadius: '1rem', cardVariant: 'neon-glow' },
    animation: 'neon-pulse',
    preview: { bg: '#0a0a0a', accent: '#00ffaa', card: 'rgba(255,255,255,0.03)', text: '#e4e4e7' },
  },
];

export function getThemeById(id: string): PortfolioThemeConfig | undefined {
  return PORTFOLIO_THEMES.find(t => t.id === id);
}

export function getThemesByCategory(category: ThemeCategory): PortfolioThemeConfig[] {
  if (category === 'all') return PORTFOLIO_THEMES;
  return PORTFOLIO_THEMES.filter(t => t.category === category || t.category === 'all');
}

/** Build CSS variables for public portfolio from a theme config */
export function buildThemeCSSVars(theme: PortfolioThemeConfig, userAccent?: string | null): React.CSSProperties {
  const accent = userAccent || theme.colors.accentDefault;
  return {
    '--pf-bg': theme.colors.bg,
    '--pf-fg': theme.colors.fg,
    '--pf-card': theme.colors.card,
    '--pf-border': theme.colors.border,
    '--pf-muted': theme.colors.muted,
    '--pf-accent': accent,
    '--pf-heading-font': theme.typography.headingFont,
    '--pf-body-font': theme.typography.bodyFont,
    '--pf-heading-weight': String(theme.typography.headingWeight),
    '--pf-card-radius': theme.layout.cardRadius,
  } as React.CSSProperties;
}
