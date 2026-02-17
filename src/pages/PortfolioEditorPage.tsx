import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Copy, Check, Sparkles, Loader2, ExternalLink,
  CheckCircle2, XCircle, Eye, EyeOff, Search
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

export default function PortfolioEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();

  // Portfolio state
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
  const [copied, setCopied] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [sections, setSections] = useState<PortfolioSections>(DEFAULT_SECTIONS);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync profile data to local state
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
      // Load new fields from profile (cast since they're new)
      const p = profile as unknown as Record<string, unknown>;
      setSections((p.portfolioSections as PortfolioSections) || DEFAULT_SECTIONS);
      setMetaTitle((p.portfolioMetaTitle as string) || '');
      setMetaDescription((p.portfolioMetaDescription as string) || '');
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

  const handleGenerateBio = async () => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes[0];
    if (!selectedResume?.summary && !profile?.jobTitle && (!selectedResume?.experience || (selectedResume.experience as unknown[]).length === 0)) {
      toast.error('Selected resume has no data for bio generation.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-portfolio-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          summary: selectedResume?.summary || '',
          fullName: profile?.fullName || '',
          jobTitle: profile?.jobTitle || '',
          experience: selectedResume?.experience || [],
        }),
      });
      if (!res.ok) throw new Error('Failed to generate bio');
      const { bio: generatedBio } = await res.json();
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to generate bio');
    } finally {
      setGeneratingBio(false);
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

      // Build update including new fields
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
        <h1 className="text-lg font-bold text-foreground">Portfolio Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 pb-safe">

        {/* Section 1: Status */}
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
                <ExternalLink className="w-4 h-4 mr-2" /> Preview Portfolio
              </Button>
            </>
          )}
          {(profile as unknown as Record<string, unknown>)?.views != null && (
            <p className="text-xs text-muted-foreground">
              👁 {String((profile as unknown as Record<string, unknown>).views || 0)} views
            </p>
          )}
        </div>

        {/* Section 2: Identity */}
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

          {/* Theme */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Portfolio Theme</label>
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Default</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 3: Bio */}
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

        {/* Section 4: Social Links */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Social Links & Contact</h3>
          <div className="space-y-2">
            <label className="text-xs font-medium">GitHub URL</label>
            <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Personal Website</label>
            <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">X (Twitter) URL</label>
            <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Contact Email (for "Hire Me")</label>
            <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>

        {/* Section 5: Section Visibility */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visible Sections</h3>
          <p className="text-xs text-muted-foreground">Choose which resume sections appear on your public portfolio.</p>
          <div className="space-y-2">
            {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
                <Switch checked={sections[key]} onCheckedChange={() => toggleSection(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: SEO */}
        <div className="glass-elevated rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SEO & Sharing</h3>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Custom Page Title</label>
            <Input placeholder={`${profile?.fullName || 'Name'} — ${profile?.jobTitle || 'Job Title'}`} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={60} />
            <p className="text-xs text-muted-foreground text-right">{metaTitle.length}/60</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Custom Meta Description</label>
            <Textarea placeholder="Defaults to your bio..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="min-h-[60px]" maxLength={160} />
            <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
          </div>
        </div>

        {/* Section 7: Publish */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Publish</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Make Portfolio Public</p>
              <p className="text-xs text-muted-foreground">Anyone with the link can view</p>
            </div>
            <Switch checked={portfolioEnabled} onCheckedChange={setPortfolioEnabled} />
          </div>

          <Button
            onClick={handleSave}
            disabled={savingPortfolio || !!usernameError || usernameAvailable === false || checkingUsername}
            className="w-full h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation"
          >
            {savingPortfolio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Portfolio Settings
          </Button>

          {portfolioEnabled && (
            <Button
              variant="destructive"
              className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation"
              onClick={() => { setPortfolioEnabled(false); handleSave(); }}
            >
              <EyeOff className="w-4 h-4 mr-2" /> Unpublish Portfolio
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
