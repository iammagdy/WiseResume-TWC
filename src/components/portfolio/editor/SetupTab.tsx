import {
  Sparkles, Loader2, CheckCircle2, XCircle, Eye, Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard } from './shared';
import type { PortfolioSections } from './ContentVisibilitySection';
import { SECTION_LABELS } from './ContentVisibilitySection';

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
  // Content visibility
  sections: PortfolioSections;
  onToggleSectionVisibility: (key: keyof PortfolioSections) => void;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  // Availability
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
    sections, onToggleSectionVisibility,
    openSections, toggleSection,
    openToWork, onOpenToWorkChange,
    availabilityHeadline, onAvailabilityHeadlineChange,
    onGenerateAvailability, generatingAvailability,
  } = props;

  const visibleCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  const now = new Date();
  const currentMonthYear = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

  return (
    <div className="space-y-5">
      {/* Username */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Username</label>
        <p className="text-[11px] text-muted-foreground font-mono">resume.thewise.cloud/p/{username || 'your-name'}</p>
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

      {/* Content Visibility */}
      <CollapsibleCard
        id="content"
        icon={<Eye className="w-4 h-4" />}
        title="Content & Visibility"
        hint={<span className="text-[11px]">{visibleCount}/{totalCount} shown</span>}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground">Choose which sections appear on your public portfolio.</p>
        <div className="space-y-2">
          {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
              <Switch checked={sections[key]} onCheckedChange={() => onToggleSectionVisibility(key)} />
            </div>
          ))}
        </div>

      </CollapsibleCard>

      {/* Availability */}
      <CollapsibleCard
        id="availability"
        icon={<Zap className="w-4 h-4" />}
        title="Availability"
        hint={openToWork ? <span className="text-[11px] text-green-500">Open to Work</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Show "Open to Work" badge</p>
            <p className="text-[11px] text-muted-foreground">Displayed prominently on your portfolio.</p>
          </div>
          <Switch checked={openToWork} onCheckedChange={onOpenToWorkChange} />
        </div>
        {openToWork && (
          <div className="space-y-1 mt-2">
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
      </CollapsibleCard>
    </div>
  );
}
