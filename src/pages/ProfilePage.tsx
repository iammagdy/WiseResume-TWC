import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Share2, FileText, Briefcase, Globe, Copy, Check, Sparkles, Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { EditProfileSheet } from '@/components/settings/EditProfileSheet';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { useResumeStore } from '@/store/resumeStore';
import { dbToResumeData, useResumeMutations } from '@/hooks/useResumes';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const [editOpen, setEditOpen] = useState(false);

  // Portfolio state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState('');
  const [portfolioEnabled, setPortfolioEnabled] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync profile data to local state
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.portfolioBio || '');
      setPortfolioEnabled(profile.portfolioEnabled || false);
    }
  }, [profile]);

  // Init selectedResumeId from profile or fallback
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      if (profile?.portfolioResumeId && resumes.some(r => r.id === profile.portfolioResumeId)) {
        setSelectedResumeId(profile.portfolioResumeId);
      } else {
        const primary = resumes.find(r => r.is_primary);
        setSelectedResumeId(primary?.id || resumes[0].id);
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

    // Skip check if username hasn't changed from profile
    if (profile?.username === username) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    usernameCheckRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('user_id', user!.id)
          .maybeSingle();
        setUsernameAvailable(!data);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => { if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current); };
  }, [username, usernameError, user, profile?.username]);

  if (!user) return null;

  const completion = calculateProfileCompletion(profile);

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleEditResume = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (resume) {
      setCurrentResume(dbToResumeData(resume));
      setCurrentResumeId(id);
      setSelectedTemplate(resume.template_id as any);
      navigate('/editor');
    }
  };

  const handleShareProfile = async () => {
    const text = `${profile?.fullName || 'User'} — ${profile?.jobTitle || 'Professional'}\n${resumes.length} resumes on WiseResume`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My WiseResume Profile', text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Profile info copied!');
    }
  };

  // Username validation
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
    if (!user) return;
    const selectedResume = resumes.find(r => r.id === selectedResumeId) || resumes.find(r => r.is_primary) || resumes[0];
    if (!selectedResume?.summary && !profile?.jobTitle && (!selectedResume?.experience || (selectedResume.experience as any[]).length === 0)) {
      toast.error('The selected resume has no summary or experience. Please choose a different resume or add details first.');
      return;
    }
    setGeneratingBio(true);
    haptics.light();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-portfolio-bio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          summary: selectedResume?.summary || '',
          fullName: profile?.fullName || '',
          jobTitle: profile?.jobTitle || '',
          experience: selectedResume?.experience || [],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate bio');
      }
      const { bio: generatedBio } = await res.json();
      setBio(generatedBio);
      toast.success('Bio generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate bio. Please try again.');
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleSavePortfolio = async () => {
    if (usernameError) return;
    setSavingPortfolio(true);
    haptics.light();
    try {
      await updateProfile({
        username: username || null,
        portfolioBio: bio || null,
        portfolioEnabled,
        portfolioResumeId: selectedResumeId || null,
      });
      toast.success('Portfolio settings saved!');
    } catch {
      toast.error('Failed to save portfolio settings');
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={profile?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile?.fullName || 'Your Name'}</h2>
            <p className="text-sm text-muted-foreground">{profile?.jobTitle || 'Add a job title'}</p>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="glass-elevated rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profile completion</span>
            <span className="font-semibold text-primary">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={handleShareProfile}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        {/* Portfolio Section */}
        <div className="glass-elevated rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Public Portfolio</h3>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">wiseresume.lovable.app/p/</span>
              <Input
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="your-name"
                className="flex-1"
              />
            </div>
            {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
            {!usernameError && username.length >= 3 && (
              <div className="flex items-center gap-1.5">
                {checkingUsername && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Checking...</span>
                  </>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-500">Available</span>
                  </>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive">Taken</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Source Resume */}
          {resumes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Source Resume</label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}{r.is_primary ? ' ★' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for your public portfolio &amp; AI bio generation</p>
              {selectedResumeId && (() => {
                const sr = resumes.find(r => r.id === selectedResumeId);
                const hasData = sr?.summary || (sr?.experience && (sr.experience as any[]).length > 0);
                if (sr && !hasData) {
                  return (
                    <p className="text-xs text-amber-500 mt-1">⚠ This resume has no summary or experience. Choose a different one or add details first.</p>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">About Me Bio</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateBio}
                disabled={generatingBio}
                className="h-8 text-xs active:scale-95"
              >
                {generatingBio ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {generatingBio ? 'Generating...' : 'AI Generate'}
              </Button>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a friendly bio or let AI generate one..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Make Portfolio Public</p>
              <p className="text-xs text-muted-foreground">Anyone with the link can view</p>
            </div>
            <Switch checked={portfolioEnabled} onCheckedChange={setPortfolioEnabled} />
          </div>

          {/* URL Copy */}
          {username && portfolioEnabled && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{portfolioUrl}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyUrl}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
              <a href={`https://${portfolioUrl}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSavePortfolio}
            disabled={savingPortfolio || !!usernameError || usernameAvailable === false || checkingUsername}
            className="w-full h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation"
          >
            {savingPortfolio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Portfolio Settings
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-elevated rounded-2xl p-4 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{resumes.length}</p>
            <p className="text-xs text-muted-foreground">Resumes</p>
          </div>
          <div className="glass-elevated rounded-2xl p-4 text-center">
            <Briefcase className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </div>
        </div>

        {/* Resume Portfolio */}
        {resumes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">My Resumes</h3>
            <div className="space-y-3">
              {resumes.map(resume => (
                <ResumeListCard
                  key={resume.id}
                  resume={resume}
                  onEdit={handleEditResume}
                  onDuplicate={(id) => duplicateResume.mutate(id)}
                  onDelete={(id) => deleteResume.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        userId={user.id}
        userEmail={user.email}
        onSave={updateProfile}
      />
    </div>
  );
}
