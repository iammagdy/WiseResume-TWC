import { useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTalentProfile, useUpsertTalentProfile } from '@/hooks/wisehire/useTalentPoolProfile';
import { toast } from 'sonner';

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
];

const AVAILABILITY = [
  { value: 'immediately', label: 'Available now' },
  { value: '2_weeks', label: '2 weeks' },
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3+ months' },
  { value: 'not_looking', label: 'Open to offers' },
];

export function TalentPoolDiscoverableCard() {
  const { data: profile, isLoading } = useMyTalentProfile();
  const upsert = useUpsertTalentProfile();
  const [skillInput, setSkillInput] = useState('');
  const [localSkills, setLocalSkills] = useState<string[] | null>(null);

  const skills = localSkills ?? profile?.skills ?? [];
  const isOptedIn = profile?.opted_in ?? false;

  function handleToggle(checked: boolean) {
    upsert.mutate(
      { opted_in: checked },
      {
        onSuccess: () => toast.success(checked ? 'Your profile is now discoverable to recruiters.' : 'Your profile is now hidden from recruiters.'),
      },
    );
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.includes(s)) { setSkillInput(''); return; }
    const next = [...skills, s];
    setLocalSkills(next);
    setSkillInput('');
    upsert.mutate({ skills: next });
  }

  function removeSkill(s: string) {
    const next = skills.filter((k) => k !== s);
    setLocalSkills(next);
    upsert.mutate({ skills: next });
  }

  if (isLoading) return null;

  return (
    <div className={cn(
      'rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden',
      isOptedIn ? 'border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-800',
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isOptedIn ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800',
          )}>
            {isOptedIn
              ? <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              : <EyeOff className="h-4 w-4 text-slate-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recruiter Visibility
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isOptedIn
                ? 'Your profile appears in WiseHire Talent Pool searches.'
                : 'You are hidden from WiseHire recruiter searches.'}
            </p>
          </div>
        </div>
        <Switch
          checked={isOptedIn}
          onCheckedChange={handleToggle}
          disabled={upsert.isPending}
          aria-label="Make my profile discoverable to recruiters"
        />
      </div>

      {isOptedIn && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4">
          {/* Headline */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Headline</label>
            <Input
              placeholder="e.g. Senior Full-Stack Engineer open to new opportunities"
              defaultValue={profile?.headline ?? ''}
              onBlur={(e) => upsert.mutate({ headline: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Experience level */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Experience</label>
              <div className="flex flex-wrap gap-1">
                {EXPERIENCE_LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => upsert.mutate({ experience_level: l.value })}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                      profile?.experience_level === l.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Availability</label>
              <div className="flex flex-wrap gap-1">
                {AVAILABILITY.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => upsert.mutate({ availability: a.value })}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                      profile?.availability === a.value
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location + remote */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Location</label>
              <Input
                placeholder="e.g. San Francisco, CA"
                defaultValue={profile?.location ?? ''}
                onBlur={(e) => upsert.mutate({ location: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 pb-1 cursor-pointer">
              <Switch
                checked={profile?.remote_ok ?? true}
                onCheckedChange={(v) => upsert.mutate({ remote_ok: v })}
                aria-label="Remote OK"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">Remote OK</span>
            </label>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Skills</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g. React, Python…"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addSkill} disabled={!skillInput.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pr-1">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Recruiters on WiseHire will see your name, headline, skills, and availability. They will not see your email or resume until you apply to a role.
          </p>
        </div>
      )}

      {upsert.isPending && (
        <div className="flex items-center gap-2 px-4 pb-3 text-xs text-slate-400">
          <MiniSpinner size={12} />
          Saving…
        </div>
      )}
    </div>
  );
}
