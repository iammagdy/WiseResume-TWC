import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { TalentSearchFilters } from '@/hooks/wisehire/useTalentPool';

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry level' },
  { value: 'mid', label: 'Mid level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Staff' },
  { value: 'executive', label: 'Executive' },
];

const AVAILABILITY = [
  { value: 'immediately', label: 'Available now' },
  { value: '2_weeks', label: '2 weeks notice' },
  { value: '1_month', label: '1 month notice' },
  { value: '3_months', label: '3+ months' },
  { value: 'not_looking', label: 'Open to offers' },
];

interface Props {
  filters: TalentSearchFilters;
  onChange: (f: Partial<TalentSearchFilters>) => void;
  onReset: () => void;
}

export function TalentSearchFilters({ filters, onChange, onReset }: Props) {
  const hasActive =
    filters.query || filters.experience_level || filters.availability || filters.remote_ok !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder="Search name, headline, skills…"
          value={filters.query ?? ''}
          onChange={(e) => onChange({ query: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={filters.experience_level ?? 'all'}
        onValueChange={(v) => onChange({ experience_level: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="Experience" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All levels</SelectItem>
          {EXPERIENCE_LEVELS.map((l) => (
            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.availability ?? 'all'}
        onValueChange={(v) => onChange({ availability: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder="Availability" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any availability</SelectItem>
          {AVAILABILITY.map((a) => (
            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.remote_ok === undefined ? 'all' : String(filters.remote_ok)}
        onValueChange={(v) => onChange({ remote_ok: v === 'all' ? undefined : v === 'true' })}
      >
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="Work style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any location</SelectItem>
          <SelectItem value="true">Remote OK</SelectItem>
          <SelectItem value="false">On-site only</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-slate-500 gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
