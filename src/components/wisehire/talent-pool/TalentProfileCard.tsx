import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { MapPin, Wifi, UserPlus, Check, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TalentProfile } from '@/hooks/wisehire/useTalentPool';
import { PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  immediately: 'Available now',
  '2_weeks': '2 weeks notice',
  '1_month': '1 month notice',
  '3_months': '3+ months',
  not_looking: 'Open to offers',
};

interface Props {
  profile: TalentProfile;
  onAddToPipeline: (profile: TalentProfile, stage: string) => void;
  adding?: boolean;
  added?: boolean;
  onView?: (profile: TalentProfile) => void;
}

export function TalentProfileCard({ profile, onAddToPipeline, adding, added, onView }: Props) {
  const [open, setOpen] = useState(false);
  const initials = (profile.full_name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-bold">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {profile.full_name ?? 'Anonymous'}
          </p>
          {profile.experience_level && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {EXPERIENCE_LABELS[profile.experience_level] ?? profile.experience_level}
            </Badge>
          )}
        </div>

        {profile.headline && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{profile.headline}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {profile.availability && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {AVAILABILITY_LABELS[profile.availability] ?? profile.availability}
            </span>
          )}
          {profile.location && (
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          {profile.remote_ok && (
            <span className="flex items-center gap-0.5 text-[11px] text-blue-500">
              <Wifi className="h-3 w-3" />
              Remote
            </span>
          )}
          {profile.view_count > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
              <Eye className="h-3 w-3" />
              {profile.view_count}
            </span>
          )}
        </div>

        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.skills.slice(0, 6).map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {s}
              </span>
            ))}
            {profile.skills.length > 6 && (
              <span className="text-[10px] text-slate-400">+{profile.skills.length - 6}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 shrink-0">
        {added ? (
          <Button size="sm" variant="outline" disabled className="h-8 gap-1.5 text-emerald-600 border-emerald-300">
            <Check className="h-3.5 w-3.5" />
            Added
          </Button>
        ) : (
          <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) onView?.(profile); }}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={adding}>
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Add to Pipeline
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 font-medium">Choose stage</p>
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  onClick={() => { onAddToPipeline(profile, stage.id); setOpen(false); }}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
