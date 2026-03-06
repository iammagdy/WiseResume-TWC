import { useState } from 'react';
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Link2, Zap, Github, RefreshCw, Linkedin,
} from 'lucide-react';
import { toast } from 'sonner';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';
import { haptics } from '@/lib/haptics';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface SetupTabProps {
  username: string;
  onUsernameChange: (val: string) => void;
  usernameError: string;
  usernameAvailable: boolean | null;
  checkingUsername: boolean;
  resumes: Array<{ id: string; title: string; is_primary?: boolean }>;
  selectedResumeId: string;
  onSelectedResumeIdChange: (id: string) => void;
  bio: string;
  onBioChange: (val: string) => void;
  onGenerateBio: () => void;
  generatingBio: boolean;
  linkedinUrl: string;
  onLinkedinUrlChange: (val: string) => void;
  githubUrl: string;
  onGithubUrlChange: (val: string) => void;
  contactEmail: string;
  onContactEmailChange: (val: string) => void;
  openToWork: boolean;
  onOpenToWorkChange: (val: boolean) => void;
  availabilityHeadline: string;
  onAvailabilityHeadlineChange: (val: string) => void;
  onGenerateAvailability: () => void;
  generatingAvailability: boolean;
}

export function SetupTab(props: SetupTabProps) {
  const {
    username, onUsernameChange, usernameError, usernameAvailable, checkingUsername,
    resumes, selectedResumeId, onSelectedResumeIdChange,
    bio, onBioChange, onGenerateBio, generatingBio,
    linkedinUrl, onLinkedinUrlChange,
    githubUrl, onGithubUrlChange, contactEmail, onContactEmailChange,
    openToWork, onOpenToWorkChange, availabilityHeadline, onAvailabilityHeadlineChange,
    onGenerateAvailability, generatingAvailability,
  } = props;

  const now = new Date();
  const currentMonthYear = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

  return (
    <div className="space-y-5">
      {/* Username */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Username</label>
        <p className="text-[11px] text-muted-foreground">WiseResume/</p>
        <Input
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="your-name"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
        />
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

      {/* Resume to display */}
      {resumes.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Resume to display</label>
          <p className="text-[11px] text-muted-foreground">Choose which resume powers your portfolio content.</p>
          <Select value={selectedResumeId} onValueChange={onSelectedResumeIdChange}>
            <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
            <SelectContent>
              {resumes.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}{r.is_primary ? ' ★' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bio */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">About Me Bio</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateBio}
            disabled={generatingBio}
            className="h-8 text-xs active:scale-95 shrink-0"
          >
            {generatingBio ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            {generatingBio ? 'Generating...' : 'AI Generate'}
          </Button>
        </div>
        <Textarea
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder="Write a friendly bio or let AI generate one..."
          className="min-h-[100px]"
          maxLength={500}
        />
        <p className="text-[11px] text-muted-foreground text-right">{bio.length}/500</p>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Link2 className="w-3.5 h-3.5" />
          Social Links & Contact
        </div>

        {/* LinkedIn URL */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
          </label>
          <Input placeholder="https://linkedin.com/in/yourusername" value={linkedinUrl} onChange={e => onLinkedinUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </div>

        {/* GitHub URL + Sync button below */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5" /> GitHub URL
          </label>
          <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={e => onGithubUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          {githubUrl && <GitHubSyncButton githubUrl={githubUrl} />}
        </div>

        {/* Contact Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Contact Email</label>
          <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={e => onContactEmailChange(e.target.value)} autoComplete="email" autoCapitalize="none" inputMode="email" />
          <p className="text-[11px] text-muted-foreground">Public email shown on your portfolio. Defaults to your account email if empty.</p>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border/40 pt-3">
          <Zap className="w-3.5 h-3.5" />
          Availability
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Show "Open to Work" badge</p>
            <p className="text-[11px] text-muted-foreground">Displayed prominently on your portfolio.</p>
          </div>
          <Switch checked={openToWork} onCheckedChange={onOpenToWorkChange} />
        </div>
        {openToWork && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Availability headline</label>
              <Button variant="ghost" size="sm" onClick={onGenerateAvailability} disabled={generatingAvailability} className="h-7 text-xs px-2 active:scale-95">
                {generatingAvailability ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                AI Suggest
              </Button>
            </div>
            <Input
              value={availabilityHeadline}
              onChange={e => onAvailabilityHeadlineChange(e.target.value)}
              placeholder={`Open to remote full-time · From ${currentMonthYear}`}
              maxLength={100}
              autoCapitalize="sentences"
            />
            <p className="text-[11px] text-muted-foreground text-right">{availabilityHeadline.length}/100</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GitHubSyncButton({ githubUrl }: { githubUrl: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!githubUrl) {
      toast.error('Enter a GitHub URL first.');
      return;
    }
    setSyncing(true);
    haptics.light();
    try {
      const token = await getClerkSupabaseToken();
      if (!token) throw new Error('Not authenticated');

      const username = githubUrl
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/\/.*$/, '')
        .trim();

      const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('@/lib/supabaseConstants');
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/fetch-github-projects`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ githubUsername: username }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Sync failed');
      }

      const result = await response.json();
      haptics.medium();
      toast.success(`Synced ${result.projects?.length || 0} GitHub projects!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="w-full h-9 text-xs active:scale-95 touch-manipulation"
    >
      {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
      {syncing ? 'Syncing GitHub Projects...' : 'Sync GitHub Projects'}
    </Button>
  );
}
