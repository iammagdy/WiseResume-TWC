import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Copy, Check, Sparkles, Loader2, ExternalLink,
  CheckCircle2, XCircle, Search, Palette, Layout, Type, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface PortfolioSections {
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  awards: boolean;
  publications: boolean;
  volunteering: boolean;
}

const DEFAULT_SECTIONS: PortfolioSections = {
  experience: true, education: true, skills: true, projects: true,
  certifications: true, awards: true, publications: true, volunteering: true,
};

const SECTION_LABELS: Record<keyof PortfolioSections, string> = {
  experience: 'Experience', education: 'Education', skills: 'Skills',
  projects: 'Projects', certifications: 'Certifications', awards: 'Awards',
  publications: 'Publications', volunteering: 'Volunteering',
};

type PortfolioStyle = 'minimal' | 'bold-dark' | 'glass-pro' | 'classic-clean';
type PortfolioLayout = 'single' | 'two-col';
type PortfolioFont = 'inter' | 'space-grotesk' | 'serif';

const THEMES: { id: PortfolioStyle; name: string; desc: string; preview: { bg: string; accent: string; card: string; text: string } }[] = [
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

const ACCENT_PRESETS = [
  '#e84545', // brand red
  '#6366f1', // indigo
  '#0ea5e9', // sky blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
];

// ─── Theme Preview Card ───────────────────────────────────────────────────────
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
        ringColor: selected ? displayAccent : 'rgba(255,255,255,0.1)',
        '--tw-ring-color': selected ? displayAccent : 'rgba(255,255,255,0.1)',
      } as React.CSSProperties}
    >
      {/* Mini preview */}
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
      {/* Label */}
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

export default function PortfolioEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();

  // Core state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState('');
  const [portfolioEnabled, setPortfolioEnabled] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingSEO, setGeneratingSEO] = useState(false);
  const [generatingAvailability, setGeneratingAvailability] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [sections, setSections] = useState<PortfolioSections>(DEFAULT_SECTIONS);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // New design state
  const [portfolioStyle, setPortfolioStyle] = useState<PortfolioStyle>('minimal');
  const [portfolioLayout, setPortfolioLayout] = useState<PortfolioLayout>('single');
  const [portfolioAccentColor, setPortfolioAccentColor] = useState('#e84545');
  const [portfolioFont, setPortfolioFont] = useState<PortfolioFont>('inter');
  const [openToWork, setOpenToWork] = useState(false);
  const [availabilityHeadline, setAvailabilityHeadline] = useState('');

  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync profile → local state
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.portfolioBio || '');
      setPortfolioEnabled(profile.portfolioEnabled || false);
      setGithubUrl(profile.githubUrl || '');
      setWebsiteUrl(profile.websiteUrl || '');
      setTwitterUrl(profile.twitterUrl || '');
      setContactEmail(profile.contactEmail || '');
      setSelectedTheme(profile.theme || 'system');
      const p = profile as unknown as Record<string, unknown>;
      setSections((p.portfolioSections as PortfolioSections) || DEFAULT_SECTIONS);
      setMetaTitle((p.portfolioMetaTitle as string) || '');
      setMetaDescription((p.portfolioMetaDescription as string) || '');
      // New fields
      setPortfolioStyle(((p.portfolioStyle as string) || 'minimal') as PortfolioStyle);
      setPortfolioLayout(((p.portfolioLayout as string) || 'single') as PortfolioLayout);
      setPortfolioAccentColor((p.portfolioAccentColor as string) || '#e84545');
      setPortfolioFont(((p.portfolioFont as string) || 'inter') as PortfolioFont);
      setOpenToWork((p.openToWork as boolean) || false);
      setAvailabilityHeadline((p.availabilityHeadline as string) || '');
    }
  }, [profile]);

  // Init selectedResumeId
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const hasData = (r: typeof resumes[0]) => !!(r.summary || (r.experience && (r.experience as unknown[]).length > 0));
      if (profile?.portfolioResumeId && resumes.some(r => r.id === profile.portfolioResumeId)) {
        setSelectedResumeId(profile.portfolioResumeId);
      } else {
        const withData = resumes.find(hasData);
        const primary = resumes.find(r => r.is_primary);
        setSelectedResumeId(withData?.id || primary?.id || resumes[0].id);
      }
    }
  }, [resumes, selectedResumeId, profile?.portfolioResumeId]);

  // Debounced username availability check
  useEffect(() => {
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (!username || username.length < 3 || usernameError) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    if (profile?.username === username) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    setUsernameAvailable(null);
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('check_username_available', {
          p_username: username,
          p_user_id: user!.id,
        });
        if (error) throw error;
        setUsernameAvailable(data === true);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => { if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current); };
  }, [username, usernameError, user, profile?.username]);

  if (!user) return null;

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError(''); return; }
    if (value.length < 3) { setUsernameError('At least 3 characters'); return; }
    if (value.length > 30) { setUsernameError('Max 30 characters'); return; }
    if (!/^[a-z0-9-]+$/.test(value)) { setUsernameError('Only lowercase letters, numbers, hyphens'); return; }
    if (value.startsWith('-') || value.endsWith('-')) { setUsernameError('Cannot start or end with hyphen'); return; }
    setUsernameError('');
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(clean);
    validateUsername(clean);
  };

  const callPortfolioAI = async (action: string, extraBody?: Record<string, unknown>) => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-portfolio-bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        action,
        summary: selectedResume?.summary || '',
        fullName: profile?.fullName || '',
        jobTitle: profile?.jobTitle || '',
        experience: selectedResume?.experience || [],
        skills: selectedResume?.skills || [],
        careerLevel: (profile as unknown as Record<string, unknown>)?.careerLevel || 'mid',
        ...extraBody,
      }),
    });
    if (!res.ok) throw new Error(`AI request failed`);
    return res.json();
  };

  const handleGenerateBio = async () => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
    if (!selectedResume?.summary && !profile?.jobTitle && (!selectedResume?.experience || (selectedResume.experience as unknown[]).length === 0)) {
      toast.error('Selected resume has no data for bio generation.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { bio: generatedBio } = await callPortfolioAI('bio');
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to generate bio');
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleGenerateSEO = async () => {
    setGeneratingSEO(true);
    haptics.light();
    try {
      const { metaTitle: t, metaDescription: d } = await callPortfolioAI('seo');
      if (t) setMetaTitle(t);
      if (d) setMetaDescription(d);
      toast.success('SEO meta generated!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to generate SEO meta');
    } finally {
      setGeneratingSEO(false);
    }
  };

  const handleGenerateAvailability = async () => {
    setGeneratingAvailability(true);
    haptics.light();
    try {
      const { headline } = await callPortfolioAI('availability');
      if (headline) setAvailabilityHeadline(headline);
      toast.success('Availability headline generated!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to generate headline');
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const handleSave = async () => {
    if (usernameError) return;
    setSavingPortfolio(true);
    haptics.light();
    try {
      if (username && username.length >= 3 && profile?.username !== username) {
        const { data: available } = await supabase.rpc('check_username_available', {
          p_username: username,
          p_user_id: user!.id,
        });
        if (!available) {
          setUsernameAvailable(false);
          toast.error('Username was just taken. Please choose another.');
          setSavingPortfolio(false);
          return;
        }
      }
      const updates: Record<string, unknown> = {
        username: username || null,
        portfolioBio: bio || null,
        portfolioEnabled,
        portfolioResumeId: selectedResumeId || null,
        githubUrl: githubUrl || null,
        websiteUrl: websiteUrl || null,
        twitterUrl: twitterUrl || null,
        contactEmail: contactEmail || null,
        theme: selectedTheme,
        portfolioSections: sections,
        portfolioMetaTitle: metaTitle || null,
        portfolioMetaDescription: metaDescription || null,
        // New fields
        portfolioStyle,
        portfolioLayout,
        portfolioAccentColor: portfolioAccentColor || null,
        portfolioFont,
        openToWork,
        availabilityHeadline: availabilityHeadline || null,
      };
      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      toast.success('Portfolio saved!');
    } catch {
      toast.error('Failed to save portfolio');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const portfolioUrl = username ? `wiseresume.lovable.app/p/${username}` : '';

  const handleCopyUrl = async () => {
    if (!portfolioUrl) return;
    await navigator.clipboard.writeText(`https://${portfolioUrl}`);
    setCopied(true);
    haptics.light();
    toast.success('URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (key: keyof PortfolioSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">My Portfolio Website</h1>
          <p className="text-[10px] text-muted-foreground leading-none">Share a beautiful profile link with the world</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-safe">

        {/* ── Status ─────────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Portfolio Status</h3>
            </div>
            <Badge variant={portfolioEnabled ? 'default' : 'secondary'} className="text-xs">
              {portfolioEnabled ? '🟢 Live' : 'Draft'}
            </Badge>
          </div>
          {portfolioEnabled && username && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{portfolioUrl}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyUrl}>
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation"
                onClick={() => window.open(`https://${portfolioUrl}`, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Preview Live Site
              </Button>
            </>
          )}
          {(profile as unknown as Record<string, unknown>)?.views != null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              👁 <span className="font-semibold text-foreground">{String((profile as unknown as Record<string, unknown>).views || 0)}</span> total views
            </p>
          )}
        </div>

        {/* ── Portfolio Strength ──────────────────────────────────────── */}
        {(() => {
          const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
          const checks = [
            { ok: !!( (profile as unknown as Record<string,unknown>)?.avatarUrl ), tip: 'Add a profile photo in Settings → Profile' },
            { ok: bio.length >= 50,                                               tip: 'Write a bio (at least 50 characters)' },
            { ok: username.length >= 3,                                           tip: 'Set a portfolio username' },
            { ok: !!(githubUrl || websiteUrl || twitterUrl || contactEmail),      tip: 'Add at least one social link or contact email' },
            { ok: availabilityHeadline.length > 0,                               tip: 'Set an availability headline' },
            { ok: metaTitle.length > 0,                                           tip: 'Add a custom page title for SEO' },
            { ok: metaDescription.length > 0,                                    tip: 'Add a meta description for SEO' },
            { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
            { ok: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3,         tip: 'Add at least 3 skills to your resume' },
            { ok: portfolioEnabled,                                               tip: 'Publish your portfolio to make it live' },
          ];
          const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
          const missing = checks.filter(c => !c.ok).slice(0, 3);
          const color = score < 40 ? 'bg-destructive' : score < 70 ? 'bg-yellow-500' : 'bg-green-500';
          const label = score < 40 ? 'Needs work' : score < 70 ? 'Good' : 'Strong';
          return (
            <div className="glass-elevated rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">💪</span>
                  <h3 className="font-semibold text-foreground">Portfolio Strength</h3>
                </div>
                <span className="text-sm font-bold text-foreground">{score}%</span>
              </div>
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              {missing.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Missing:</p>
                  {missing.map((m, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary shrink-0 mt-0.5">·</span>{m.tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Theme Gallery ───────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Visual Theme</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {THEMES.map(theme => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                selected={portfolioStyle === theme.id}
                accent={portfolioAccentColor}
                onSelect={() => { haptics.light(); setPortfolioStyle(theme.id); }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {THEMES.find(t => t.id === portfolioStyle)?.desc}
          </p>
        </div>

        {/* ── Customization: Accent + Font + Layout ───────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Customization</h3>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Accent Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map(color => (
                <button
                  key={color}
                  onClick={() => { haptics.light(); setPortfolioAccentColor(color); }}
                  className="w-8 h-8 rounded-full transition-all active:scale-90"
                  style={{
                    background: color,
                    outline: portfolioAccentColor === color ? `3px solid ${color}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                  title={color}
                />
              ))}
              {/* Custom color picker */}
              <div className="relative">
                <input
                  type="color"
                  value={portfolioAccentColor}
                  onChange={e => setPortfolioAccentColor(e.target.value)}
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
            <p className="text-xs text-muted-foreground font-mono">{portfolioAccentColor}</p>
          </div>

          {/* Font */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Font Style</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'inter', label: 'Sans', sample: 'Aa', font: 'Inter' },
                { id: 'space-grotesk', label: 'Display', sample: 'Aa', font: 'Space Grotesk' },
                { id: 'serif', label: 'Serif', sample: 'Aa', font: 'Georgia' },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => { haptics.light(); setPortfolioFont(f.id); }}
                  className={`py-3 px-2 rounded-xl border text-center transition-all active:scale-95 ${portfolioFont === f.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                >
                  <p className="text-base" style={{ fontFamily: f.font }}>{f.sample}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Desktop Layout</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'single', label: 'Single Column', icon: '▌' },
                { id: 'two-col', label: 'Two Column', icon: '▌▌' },
              ] as const).map(l => (
                <button
                  key={l.id}
                  onClick={() => { haptics.light(); setPortfolioLayout(l.id); }}
                  className={`py-3 px-4 rounded-xl border text-center transition-all active:scale-95 ${portfolioLayout === l.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                >
                  <p className="text-base font-mono">{l.icon}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.label}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Mobile is always single column regardless of this setting.</p>
          </div>
        </div>

        {/* ── Availability ─────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Availability</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Show "Open to Work" badge</p>
              <p className="text-xs text-muted-foreground">Green pulsing badge on your hero section</p>
            </div>
            <Switch checked={openToWork} onCheckedChange={v => { haptics.light(); setOpenToWork(v); }} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Availability headline</label>
              <Button variant="ghost" size="sm" onClick={handleGenerateAvailability} disabled={generatingAvailability} className="h-7 text-xs px-2 active:scale-95">
                {generatingAvailability ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                AI Suggest
              </Button>
            </div>
            <Input
              value={availabilityHeadline}
              onChange={e => setAvailabilityHeadline(e.target.value)}
              placeholder="Open to remote full-time · From June 2025"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{availabilityHeadline.length}/100</p>
          </div>
        </div>

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity</h3>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <p className="text-xs text-muted-foreground">wiseresume.lovable.app/p/</p>
            <Input value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="your-name" />
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
            {!usernameError && username.length >= 3 && (
              <div className="flex items-center gap-1.5">
                {checkingUsername && <><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking...</span></>}
                {!checkingUsername && usernameAvailable === true && <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-500">Available</span></>}
                {!checkingUsername && usernameAvailable === false && <><XCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-xs text-destructive">Taken</span></>}
              </div>
            )}
          </div>

          {/* Source Resume */}
          {resumes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Source Resume</label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
                <SelectContent>
                  {resumes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title}{r.is_primary ? ' ★' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Page Color Mode (legacy portfolio_theme — kept for backward compat) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Page Color Mode</label>
            <p className="text-xs text-muted-foreground">Overrides system dark/light preference for visitors.</p>
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Follow Visitor's System</SelectItem>
                <SelectItem value="dark">Always Dark</SelectItem>
                <SelectItem value="light">Always Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Bio ──────────────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About Me Bio</h3>
            <Button variant="ghost" size="sm" onClick={handleGenerateBio} disabled={generatingBio} className="h-8 text-xs active:scale-95">
              {generatingBio ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              {generatingBio ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a friendly bio or let AI generate one..." className="min-h-[100px]" maxLength={500} />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </div>

        {/* ── Social Links ─────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Social Links & Contact</h3>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">GitHub URL</label>
            <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Personal Website</label>
            <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">X (Twitter) URL</label>
            <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Contact Email (for "Hire Me" button)</label>
            <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>

        {/* ── Section Visibility ───────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visible Sections</h3>
          <p className="text-xs text-muted-foreground">Choose which sections appear on your public portfolio.</p>
          <div className="space-y-2">
            {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
                <Switch checked={sections[key]} onCheckedChange={() => toggleSection(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── SEO ─────────────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SEO & Sharing</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={handleGenerateSEO} disabled={generatingSEO} className="h-7 text-xs px-2 active:scale-95">
              {generatingSEO ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              AI Generate
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Custom Page Title</label>
            <Input placeholder={`${profile?.fullName || 'Name'} — ${profile?.jobTitle || 'Job Title'}`} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={60} />
            <p className="text-xs text-muted-foreground text-right">{metaTitle.length}/60</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Custom Meta Description</label>
            <Textarea placeholder="Defaults to your bio..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="min-h-[60px]" maxLength={160} />
            <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
          </div>
        </div>

        {/* ── Publish ─────────────────────────────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Publish</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Make Portfolio Public</p>
              <p className="text-xs text-muted-foreground">Anyone with the link can view your portfolio website</p>
            </div>
            <Switch checked={portfolioEnabled} onCheckedChange={setPortfolioEnabled} />
          </div>

          <Button
            onClick={handleSave}
            disabled={savingPortfolio || !!usernameError || usernameAvailable === false || checkingUsername}
            className="w-full h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation"
          >
            {savingPortfolio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Portfolio
          </Button>

          {portfolioEnabled && (
            <Button
              variant="destructive"
              className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation"
              onClick={() => { setPortfolioEnabled(false); handleSave(); }}
            >
              Unpublish Portfolio
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
