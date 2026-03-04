import React from 'react';
import {
  User, Sparkles, Loader2, CheckCircle2, XCircle, Link2, Zap, Linkedin, Github,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CollapsibleCard, SubSectionHeading } from './shared';

export interface ProfileSectionProps {
  openSections: Set<string>;
  toggleSection: (id: string) => void;
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
  githubUrl: string;
  onGithubUrlChange: (val: string) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (val: string) => void;
  twitterUrl: string;
  onTwitterUrlChange: (val: string) => void;
  contactEmail: string;
  onContactEmailChange: (val: string) => void;
  openToWork: boolean;
  onOpenToWorkChange: (val: boolean) => void;
  availabilityHeadline: string;
  onAvailabilityHeadlineChange: (val: string) => void;
  onGenerateAvailability: () => void;
  generatingAvailability: boolean;
  currentUsername: string | null;
}

export function ProfileSection(props: ProfileSectionProps) {
  const {
    openSections, toggleSection, username, onUsernameChange, usernameError,
    usernameAvailable, checkingUsername, resumes, selectedResumeId,
    onSelectedResumeIdChange, bio, onBioChange, onGenerateBio, generatingBio,
    githubUrl, onGithubUrlChange, websiteUrl, onWebsiteUrlChange,
    twitterUrl, onTwitterUrlChange, contactEmail, onContactEmailChange,
    openToWork, onOpenToWorkChange, availabilityHeadline, onAvailabilityHeadlineChange,
    onGenerateAvailability, generatingAvailability,
  } = props;

  return (
    <CollapsibleCard
      id="profile"
      icon={<User className="w-4 h-4" />}
      title="Profile"
      hint={username ? <span className="font-mono text-muted-foreground">/p/{username}</span> : undefined}
      openSections={openSections}
      toggleSection={toggleSection}
    >
      {/* Username */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Username</label>
        <p className="text-xs text-muted-foreground">WiseResume/</p>
        <Input value={username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="your-name" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="url" />
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
          <Select value={selectedResumeId} onValueChange={onSelectedResumeIdChange}>
            <SelectTrigger><SelectValue placeholder="Select a resume" /></SelectTrigger>
            <SelectContent>
              {resumes.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.title}{r.is_primary ? ' ★' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bio */}
      <SubSectionHeading icon={<Sparkles className="w-3.5 h-3.5" />} label="About Me Bio" />
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">Write a friendly bio or let AI generate one.</p>
        <Button variant="ghost" size="sm" onClick={onGenerateBio} disabled={generatingBio} className="h-8 text-xs active:scale-95 shrink-0">
          {generatingBio ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          {generatingBio ? 'Generating...' : 'AI Generate'}
        </Button>
      </div>
      <Textarea value={bio} onChange={(e) => onBioChange(e.target.value)} placeholder="Write a friendly bio or let AI generate one..." className="min-h-[100px]" maxLength={500} />
      <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>

      {/* Social Links */}
      <SubSectionHeading icon={<Link2 className="w-3.5 h-3.5" />} label="Social Links & Contact" />
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">GitHub URL</label>
        <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={(e) => onGithubUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Personal Website</label>
        <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={(e) => onWebsiteUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">X (Twitter) URL</label>
        <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={(e) => onTwitterUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Contact Email (for "Hire Me" button)</label>
        <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={(e) => onContactEmailChange(e.target.value)} autoComplete="email" autoCapitalize="none" inputMode="email" />
      </div>

      {/* Availability */}
      <SubSectionHeading icon={<Zap className="w-3.5 h-3.5" />} label="Availability" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Show "Open to Work" badge</p>
          <p className="text-xs text-muted-foreground">Displayed prominently on your portfolio.</p>
        </div>
        <Switch checked={openToWork} onCheckedChange={onOpenToWorkChange} />
      </div>
      {openToWork && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Availability headline</label>
            <Button variant="ghost" size="sm" onClick={onGenerateAvailability} disabled={generatingAvailability} className="h-7 text-xs px-2 active:scale-95">
              {generatingAvailability ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              AI Suggest
            </Button>
          </div>
          <Input value={availabilityHeadline} onChange={e => onAvailabilityHeadlineChange(e.target.value)} placeholder="Open to remote full-time · From June 2025" maxLength={100} autoCapitalize="sentences" />
          <p className="text-xs text-muted-foreground text-right">{availabilityHeadline.length}/100</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
