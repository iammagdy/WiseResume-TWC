import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CareerCardSheet } from '@/components/portfolio/CareerCardSheet';
import { PortfolioQRDialog } from '@/components/portfolio/PortfolioQRDialog';
import { VisitorsPanel } from '@/components/portfolio/VisitorsPanel';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Copy, Check, Sparkles, Loader2, ExternalLink,
  CheckCircle2, XCircle, Search, Palette, Layout, Type, Zap, ChevronDown,
  User, Link2, Eye, QrCode, Download, Share2, X, Plus, Briefcase, Star,
  ArrowRight, BarChart2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { computeSkillFrequencies, getSkillTier, TIER_STYLES } from '@/lib/skillCloud';
import type { Experience, Project } from '@/types/resume';

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
  '#e84545', '#6366f1', '#0ea5e9', '#10b981',
  '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
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

// ─── Collapsible Section Card ────────────────────────────────────────────────
function CollapsibleCard({
  id, icon, title, hint, openSections, toggleSection, children, action,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const isOpen = openSections.has(id);
  return (
    <div className="glass-elevated rounded-2xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 text-left active:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-primary shrink-0">{icon}</span>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {!isOpen && hint && (
            <span className="text-xs text-muted-foreground truncate ml-1">{hint}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {action && !isOpen && action}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PortfolioEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();

  // Collapsible sections state — all collapsed by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Banner dismiss state
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('portfolio_info_dismissed') === '1'
  );

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
  const [portfolioStyle, setPortfolioStyle] = useState<PortfolioStyle>('minimal');
  const [portfolioLayout, setPortfolioLayout] = useState<PortfolioLayout>('single');
  const [portfolioAccentColor, setPortfolioAccentColor] = useState('#e84545');
  const [portfolioFont, setPortfolioFont] = useState<PortfolioFont>('inter');
  const [openToWork, setOpenToWork] = useState(false);
  const [availabilityHeadline, setAvailabilityHeadline] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showCareerCard, setShowCareerCard] = useState(false);
  const [syncMode, setSyncMode] = useState<'auto' | 'locked'>('auto');
  const [caseStudies, setCaseStudies] = useState<Array<{id:string;title:string;challenge:string;outcome:string}>>([]);
  const [services, setServices] = useState<Array<{id:string;title:string;description:string;category:string}>>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);

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
      setPortfolioStyle((profile.portfolioStyle || 'minimal') as PortfolioStyle);
      setPortfolioLayout((profile.portfolioLayout || 'single') as PortfolioLayout);
      setPortfolioAccentColor(profile.portfolioAccentColor || '#e84545');
      setPortfolioFont((profile.portfolioFont || 'inter') as PortfolioFont);
      setOpenToWork(profile.openToWork || false);
      setAvailabilityHeadline(profile.availabilityHeadline || '');
      setSyncMode((profile.portfolioSyncMode as 'auto' | 'locked') || 'auto');
      const extras = (profile.portfolioExtras as Record<string, unknown>) || {};
      setCaseStudies((extras.caseStudies as Array<{id:string;title:string;challenge:string;outcome:string}>) || []);
      setServices((extras.services as Array<{id:string;title:string;description:string;category:string}>) || []);
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

  // ── Skill Frequency Scores (must be before early return) ──────────────────
  const _selectedResumeForSkills = resumes.find(r => r.id === selectedResumeId) || resumes[0];
  const skillScores = useMemo(() => {
    const skills = (_selectedResumeForSkills?.skills ?? []) as string[];
    const experience = (_selectedResumeForSkills?.experience ?? []) as Experience[];
    const projects = (_selectedResumeForSkills?.projects ?? []) as Project[];
    if (!skills.length) return {};
    return computeSkillFrequencies(skills, experience, projects);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_selectedResumeForSkills]);

  const sortedSkillScores = useMemo(
    () => Object.entries(skillScores).sort(([, a], [, b]) => b - a),
    [skillScores]
  );

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

  const handleSave = async (overrides?: { portfolioEnabled?: boolean }) => {
    const isEnabling = overrides?.portfolioEnabled === true ||
      (overrides?.portfolioEnabled === undefined && portfolioEnabled);
    if (isEnabling && !username) {
      toast.error('Set a username before publishing your portfolio.');
      setSavingPortfolio(false);
      return;
    }
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
        portfolioEnabled: overrides?.portfolioEnabled !== undefined ? overrides.portfolioEnabled : portfolioEnabled,
        portfolioResumeId: selectedResumeId || null,
        githubUrl: githubUrl || null,
        websiteUrl: websiteUrl || null,
        twitterUrl: twitterUrl || null,
        contactEmail: contactEmail || null,
        theme: selectedTheme,
        portfolioSections: sections,
        portfolioMetaTitle: metaTitle || null,
        portfolioMetaDescription: metaDescription || null,
        portfolioStyle,
        portfolioLayout,
        portfolioAccentColor: portfolioAccentColor || null,
        portfolioFont,
        openToWork,
        availabilityHeadline: availabilityHeadline || null,
        portfolioSyncMode: syncMode,
        portfolioExtras: { caseStudies, services },
      };
      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      if (overrides?.portfolioEnabled !== undefined) {
        setPortfolioEnabled(overrides.portfolioEnabled);
      }
      toast.success('Portfolio saved!');
    } catch {
      toast.error('Failed to save portfolio');
    } finally {
      setSavingPortfolio(false);
    }
  };

  // Display URL (cosmetic — no "lovable" branding shown to user)
  const portfolioDisplayUrl = username ? `wiseresume.app/p/${username}` : '';
  // Actual URL (real domain the app runs on — dynamic, works with custom domains)
  const actualPortfolioUrl = username ? `${window.location.origin}/p/${username}` : '';

  const handleCopyUrl = async () => {
    if (!actualPortfolioUrl) return;
    await navigator.clipboard.writeText(actualPortfolioUrl);
    setCopied(true);
    haptics.light();
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // QR download is now handled inside PortfolioQRDialog

  const handleShareQR = async () => {
    if (!actualPortfolioUrl) return;
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.fullName || 'My'} Portfolio`, url: actualPortfolioUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(actualPortfolioUrl);
      toast.success('Link copied!');
    }
  };

  const toggleSectionVisibility = (key: keyof PortfolioSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Portfolio Strength ────────────────────────────────────────────────────
  const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
  const strengthChecks = [
    { ok: !!profile?.avatarUrl, tip: 'Add a profile photo in Settings → Profile' },
    { ok: bio.length >= 50, tip: 'Write a bio (at least 50 characters)' },
    { ok: username.length >= 3, tip: 'Set a portfolio username' },
    { ok: !!(githubUrl || websiteUrl || twitterUrl || contactEmail), tip: 'Add at least one social link or contact email' },
    { ok: availabilityHeadline.length > 0, tip: 'Set an availability headline' },
    { ok: metaTitle.length > 0, tip: 'Add a custom page title for SEO' },
    { ok: metaDescription.length > 0, tip: 'Add a meta description for SEO' },
    { ok: Array.isArray(selectedResume?.experience) && (selectedResume?.experience as unknown[]).length >= 1, tip: 'Add work experience to your resume' },
    { ok: Array.isArray(selectedResume?.skills) && (selectedResume?.skills as unknown[]).length >= 3, tip: 'Add at least 3 skills to your resume' },
    { ok: portfolioEnabled, tip: 'Publish your portfolio to make it live' },
  ];
  const strengthScore = Math.round((strengthChecks.filter(c => c.ok).length / strengthChecks.length) * 100);
  const strengthMissing = strengthChecks.filter(c => !c.ok).slice(0, 3);
  const strengthColor = strengthScore < 40 ? 'bg-destructive' : strengthScore < 70 ? 'bg-yellow-500' : 'bg-green-500';
  const strengthLabel = strengthScore < 40 ? 'Needs work' : strengthScore < 70 ? 'Good' : 'Strong';

  const maxScore = sortedSkillScores[0]?.[1] ?? 1;
  const strongSkillCount = sortedSkillScores.filter(([, s]) => s >= 2).length;
  const dimSkillCount = sortedSkillScores.filter(([, s]) => s === 0).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">My Portfolio Website</h1>
          <p className="text-[10px] text-muted-foreground leading-none">Share a beautiful profile link with the world</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-24">
        {/* Info banner removed — replaced by hero card */}

        {/* ── Hero Card: Portfolio Overview ─────────────────────────── */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Portfolio Overview</h3>
            <Badge variant={portfolioEnabled ? 'default' : 'secondary'} className="text-xs">
              {portfolioEnabled ? '🟢 Live' : 'Draft'}
            </Badge>
          </div>

          {/* URL row */}
          {username && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate flex-1 font-mono">{portfolioDisplayUrl}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyUrl} title="Copy link">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { haptics.light(); setShowQR(true); }} title="QR Code">
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Compact stats row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{profile?.views || 0}</span> views
            </span>
            <span className="text-border">·</span>
            <span className={`font-semibold ${strengthScore < 40 ? 'text-destructive' : strengthScore < 70 ? 'text-yellow-500' : 'text-green-500'}`}>
              {strengthScore}% · {strengthLabel}
            </span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              <span className="text-emerald-400 font-medium">{strongSkillCount}</span> skills
            </span>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-foreground">Make portfolio public</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Anyone with your link can view your portfolio website.</p>
            </div>
            <Switch checked={portfolioEnabled} onCheckedChange={setPortfolioEnabled} />
          </div>

          {/* Save */}
          <Button
            onClick={() => handleSave()}
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
              onClick={() => handleSave({ portfolioEnabled: false })}
            >
              Unpublish Portfolio
            </Button>
          )}

          {/* Quick actions (only when live) */}
          {portfolioEnabled && username && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" className="h-10 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-xs" onClick={() => window.open(actualPortfolioUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-4 h-4 mr-1.5" /> Preview
              </Button>
              <Button variant="outline" className="h-10 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-xs" onClick={() => { haptics.light(); setShowCareerCard(true); }}>
                <Sparkles className="w-4 h-4 mr-1.5" /> Career Card
              </Button>
            </div>
          )}
        </div>

        {/* ── Strength Tips (below hero, only when < 100%) ───────────── */}
        {strengthMissing.length > 0 && (
          <CollapsibleCard
            id="strength-tips"
            icon={<span className="text-base">💪</span>}
            title="Improve your score"
            hint={<span className="text-xs text-muted-foreground">{strengthMissing.length} tip{strengthMissing.length !== 1 ? 's' : ''}</span>}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <div className="space-y-1.5">
              {strengthMissing.map((m, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary shrink-0 mt-0.5">·</span>{m.tip}
                </p>
              ))}
            </div>
          </CollapsibleCard>
        )}

        {/* ── QR Code Dialog ───────────────────────────────────────────── */}
        <PortfolioQRDialog
          open={showQR}
          onOpenChange={setShowQR}
          portfolioUrl={actualPortfolioUrl}
          displayUrl={portfolioDisplayUrl}
          onShare={handleShareQR}
        />

        {/* ── Visitors & Analytics (detail view) ───────────────────────── */}
        <CollapsibleCard
          id="visitors"
          icon={<Eye className="w-4 h-4" />}
          title="Visitors & Analytics"
          hint={profile?.views != null ? <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{profile.views} views</Badge> : undefined}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <VisitorsPanel
            username={profile?.username || undefined}
            userId={user?.id}
            portfolioEnabled={portfolioEnabled}
          />
        </CollapsibleCard>

        {/* ── Skills on your portfolio ───────────────────────────────── */}
        {sortedSkillScores.length > 0 && (
          <CollapsibleCard
            id="skill-cloud"
            icon={<BarChart2 className="w-4 h-4" />}
            title="Skills on your portfolio"
            hint={
              <span className="text-[10px] text-muted-foreground">
                <span className="text-emerald-400 font-medium">{strongSkillCount} highlighted skills</span>
              </span>
            }
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-2">
              How often each skill appears in your experience &amp; projects — higher scores show larger in your public Skills cloud.
            </p>
            <div className="space-y-0.5">
              {sortedSkillScores.slice(0, showAllSkills ? 999 : 20).map(([skill, score]) => {
                const { tier } = getSkillTier(score);
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                return (
                  <div key={skill} className="flex items-center gap-2 py-1.5">
                    <span className="text-sm text-foreground truncate flex-1 min-w-0">{skill}</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                      <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">
                      {score > 0 ? `${score} mention${score !== 1 ? 's' : ''}` : 'not found'}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${TIER_STYLES[tier]}`}>
                      {tier.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
            {sortedSkillScores.length > 20 && (
              <button className="mt-1 text-xs text-primary underline-offset-2 hover:underline active:scale-95 transition-transform" onClick={() => { haptics.light(); setShowAllSkills(v => !v); }}>
                {showAllSkills ? 'Show less' : `Show all ${sortedSkillScores.length} skills`}
              </button>
            )}
            {dimSkillCount > 0 && (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <span>💡</span>
                  {dimSkillCount} skill{dimSkillCount !== 1 ? 's' : ''} not found in your experience
                </p>
                <p className="text-xs text-muted-foreground">
                  Mention them in job descriptions or projects to make them appear larger in your public Skills word cloud.
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2 gap-1 active:scale-95" onClick={() => { haptics.light(); navigate('/editor'); }}>
                  Go to Resume Editor <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CollapsibleCard>
        )}

        {/* ── Visual Theme (collapsible) ────────────────────────────── */}
        <CollapsibleCard
          id="theme"
          icon={<Palette className="w-4 h-4" />}
          title="Visual Theme"
          hint={<Badge variant="outline" className="text-[10px] py-0 px-1.5">{THEMES.find(t => t.id === portfolioStyle)?.name || 'Minimal'}</Badge>}
          openSections={openSections}
          toggleSection={toggleSection}
        >
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
        </CollapsibleCard>

        {/* ── Customization (always show) ───────────────────────────── */}
        <CollapsibleCard
          id="customization"
          icon={<Sparkles className="w-4 h-4" />}
          title="Customization"
          hint={<span className="inline-block w-4 h-4 rounded-full border border-border" style={{ background: portfolioAccentColor }} />}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Accent Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map(color => (
                <button
                  key={color}
                  onClick={() => { haptics.light(); setPortfolioAccentColor(color); }}
                  className="w-8 h-8 rounded-full transition-all active:scale-90"
                  style={{ background: color, outline: portfolioAccentColor === color ? `3px solid ${color}` : '3px solid transparent', outlineOffset: '2px' }}
                  title={color}
                />
              ))}
              <div className="relative">
                <input type="color" value={portfolioAccentColor} onChange={e => setPortfolioAccentColor(e.target.value)} className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer" title="Custom color" />
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground" style={{ background: ACCENT_PRESETS.includes(portfolioAccentColor) ? 'transparent' : portfolioAccentColor }}>
                  {ACCENT_PRESETS.includes(portfolioAccentColor) ? '+' : ''}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{portfolioAccentColor}</p>
          </div>
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
                <button key={f.id} onClick={() => { haptics.light(); setPortfolioFont(f.id); }} className={`py-3 px-2 rounded-xl border text-center transition-all active:scale-95 ${portfolioFont === f.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <p className="text-base" style={{ fontFamily: f.font }}>{f.sample}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
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
                <button key={l.id} onClick={() => { haptics.light(); setPortfolioLayout(l.id); }} className={`py-3 px-4 rounded-xl border text-center transition-all active:scale-95 ${portfolioLayout === l.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <p className="text-base font-mono">{l.icon}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.label}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Mobile is always single column.</p>
          </div>
        </CollapsibleCard>

        {/* ── Identity (always show) ────────────────────────────────── */}
        <CollapsibleCard
          id="identity"
          icon={<User className="w-4 h-4" />}
          title="Identity"
          hint={username ? <span className="font-mono text-muted-foreground">/p/{username}</span> : undefined}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <p className="text-xs text-muted-foreground">wiseresume.app/p/</p>
            <Input value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="your-name" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="url" />
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
            {!usernameError && username.length >= 3 && (
              <div className="flex items-center gap-1.5">
                {checkingUsername && <><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Checking...</span></>}
                {!checkingUsername && usernameAvailable === true && <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-500">Available</span></>}
                {!checkingUsername && usernameAvailable === false && <><XCircle className="w-3.5 h-3.5 text-destructive" /><span className="text-xs text-destructive">Taken</span></>}
              </div>
            )}
          </div>
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
        </CollapsibleCard>

        {/* ── About Me Bio (with edit icon) ─────────────────────────── */}
        <CollapsibleCard
          id="bio"
          icon={<User className="w-4 h-4" />}
          title="About Me Bio"
          hint={bio ? <span className="truncate max-w-[140px]">{bio.slice(0, 40)}{bio.length > 40 ? '…' : ''}</span> : undefined}
          openSections={openSections}
          toggleSection={toggleSection}
          action={<span className="text-muted-foreground"><Sparkles className="w-3.5 h-3.5" /></span>}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Write a friendly bio or let AI generate one.</p>
            <Button variant="ghost" size="sm" onClick={handleGenerateBio} disabled={generatingBio} className="h-8 text-xs active:scale-95 shrink-0">
              {generatingBio ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              {generatingBio ? 'Generating...' : 'AI Generate'}
            </Button>
          </div>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a friendly bio or let AI generate one..." className="min-h-[100px]" maxLength={500} />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </CollapsibleCard>

        {/* ── Social Links (conditional + edit icon) ────────────────── */}
        {(showAllSections || githubUrl || websiteUrl || twitterUrl || contactEmail) && (
          <CollapsibleCard
            id="social"
            icon={<Link2 className="w-4 h-4" />}
            title="Social Links & Contact"
            hint={[githubUrl, websiteUrl, twitterUrl, contactEmail].filter(Boolean).length > 0
              ? <span>{[githubUrl, websiteUrl, twitterUrl, contactEmail].filter(Boolean).length} linked</span>
              : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
            action={<span className="text-muted-foreground"><Link2 className="w-3.5 h-3.5" /></span>}
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">GitHub URL</label>
              <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Personal Website</label>
              <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">X (Twitter) URL</label>
              <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Contact Email (for "Hire Me" button)</label>
              <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} autoComplete="email" autoCapitalize="none" inputMode="email" />
            </div>
          </CollapsibleCard>
        )}

        {/* ── Availability (conditional) ────────────────────────────── */}
        {(showAllSections || openToWork || availabilityHeadline) && (
          <CollapsibleCard
            id="availability"
            icon={<Zap className="w-4 h-4" />}
            title="Availability"
            hint={openToWork ? <span className="text-green-500 font-medium">Open to Work ✓</span> : availabilityHeadline ? <span className="truncate max-w-[120px]">{availabilityHeadline}</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
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
              <Input value={availabilityHeadline} onChange={e => setAvailabilityHeadline(e.target.value)} placeholder="Open to remote full-time · From June 2025" maxLength={100} autoCapitalize="sentences" />
              <p className="text-xs text-muted-foreground text-right">{availabilityHeadline.length}/100</p>
            </div>
          </CollapsibleCard>
        )}

        {/* ── Section Visibility ────────────────────────────────────── */}
        <CollapsibleCard
          id="sections"
          icon={<Eye className="w-4 h-4" />}
          title="Visible Sections"
          hint={<span>{Object.values(sections).filter(Boolean).length} of {Object.keys(sections).length} shown</span>}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <p className="text-xs text-muted-foreground">Choose which sections appear on your public portfolio.</p>
          <div className="space-y-2">
            {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
                <Switch checked={sections[key]} onCheckedChange={() => toggleSectionVisibility(key)} />
              </div>
            ))}
          </div>
        </CollapsibleCard>

        {/* ── Sync Mode ──────────────────────────────────────────────── */}
        <CollapsibleCard
          id="sync"
          icon={<Sparkles className="w-4 h-4" />}
          title="Content Sync Mode"
          hint={<span>{syncMode === 'auto' ? 'Auto — resumes sync live' : 'Locked'}</span>}
          openSections={openSections}
          toggleSection={toggleSection}
        >
          <p className="text-xs text-muted-foreground mb-3">Control how your portfolio content stays in sync with your resume.</p>
          <div className="space-y-2">
            <button onClick={() => setSyncMode('auto')} className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${syncMode === 'auto' ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}>
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${syncMode === 'auto' ? 'border-primary' : 'border-muted-foreground'}`}>
                {syncMode === 'auto' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Auto-sync</p>
                <p className="text-xs text-muted-foreground">Changes to your resumes automatically sync to this portfolio.</p>
              </div>
            </button>
            <button onClick={() => setSyncMode('locked')} className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${syncMode === 'locked' ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}>
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${syncMode === 'locked' ? 'border-primary' : 'border-muted-foreground'}`}>
                {syncMode === 'locked' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Locked snapshot</p>
                <p className="text-xs text-muted-foreground">Freeze your portfolio at this version — edits to your resume won't affect it</p>
              </div>
            </button>
          </div>
        </CollapsibleCard>

        {/* ── Case Studies (conditional) ──────────────────────────────── */}
        {(showAllSections || caseStudies.length > 0) && (
          <CollapsibleCard
            id="casestudies"
            icon={<Briefcase className="w-4 h-4" />}
            title="Case Studies"
            hint={caseStudies.length > 0 ? <span>{caseStudies.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">Showcase detailed project stories with challenge, approach, and outcome.</p>
            <div className="space-y-3">
              {caseStudies.map((cs, i) => (
                <div key={cs.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case Study {i + 1}</span>
                    <button onClick={() => setCaseStudies(prev => prev.filter(c => c.id !== cs.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Title (e.g. Redesigned onboarding flow)" value={cs.title} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, title: e.target.value} : c))} />
                  <Textarea placeholder="Challenge — What problem were you solving?" value={cs.challenge} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, challenge: e.target.value} : c))} className="min-h-[60px] text-sm" />
                  <Textarea placeholder="Outcome — What was the measurable result?" value={cs.outcome} onChange={e => setCaseStudies(prev => prev.map(c => c.id === cs.id ? {...c, outcome: e.target.value} : c))} className="min-h-[60px] text-sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCaseStudies(prev => [...prev, {id: crypto.randomUUID(), title:'', challenge:'', outcome:''}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Case Study
              </Button>
            </div>
          </CollapsibleCard>
        )}

        {/* ── Services (conditional) ──────────────────────────────────── */}
        {(showAllSections || services.length > 0) && (
          <CollapsibleCard
            id="services"
            icon={<Star className="w-4 h-4" />}
            title="Services & Offerings"
            hint={services.length > 0 ? <span>{services.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-xs text-muted-foreground mb-3">List what you offer as a freelancer, consultant, or professional.</p>
            <div className="space-y-3">
              {services.map((svc, i) => (
                <div key={svc.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service {i + 1}</span>
                    <button onClick={() => setServices(prev => prev.filter(s => s.id !== svc.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Service title (e.g. UX Audit)" value={svc.title} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, title: e.target.value} : s))} />
                  <Textarea placeholder="Brief description of what's included..." value={svc.description} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, description: e.target.value} : s))} className="min-h-[60px] text-sm" />
                  <select value={svc.category} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? {...s, category: e.target.value} : s))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="consulting">Consulting</option>
                    <option value="writing">Writing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setServices(prev => [...prev, {id: crypto.randomUUID(), title:'', description:'', category:'development'}])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Service
              </Button>
            </div>
          </CollapsibleCard>
        )}

        {/* ── SEO & Sharing (conditional) ───────────────────────────── */}
        {(showAllSections || metaTitle || metaDescription) && (
          <CollapsibleCard
            id="seo"
            icon={<Search className="w-4 h-4" />}
            title="SEO & Sharing"
            hint={metaTitle ? <span className="truncate max-w-[120px]">{metaTitle}</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Customize how your portfolio appears on Google & social media.</p>
              <Button variant="ghost" size="sm" onClick={handleGenerateSEO} disabled={generatingSEO} className="h-7 text-xs px-2 active:scale-95 shrink-0 ml-2">
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
          </CollapsibleCard>
        )}

        {/* ── "Add more sections" toggle ─────────────────────────────── */}
        {!showAllSections && (
          <Button
            variant="outline"
            className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-sm"
            onClick={() => { haptics.light(); setShowAllSections(true); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add more sections
          </Button>
        )}

      </div>

      <CareerCardSheet
        open={showCareerCard}
        onOpenChange={setShowCareerCard}
        profile={profile as Parameters<typeof CareerCardSheet>[0]['profile']}
        selectedResume={selectedResume as Parameters<typeof CareerCardSheet>[0]['selectedResume']}
        accentColor={portfolioAccentColor}
      />
    </div>
  );
}
