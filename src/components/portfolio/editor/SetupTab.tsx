import {
  Sparkles, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
}

export function SetupTab(props: SetupTabProps) {
  const {
    username, onUsernameChange, usernameError, usernameAvailable, checkingUsername,
    resumes, selectedResumeId, onSelectedResumeIdChange,
    bio, onBioChange, onGenerateBio, generatingBio,
  } = props;

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
    </div>
  );
}
