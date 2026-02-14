import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface JobFilters {
  query: string;
  jobTypes: string[];
  location: string;
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
}

export function JobSearchSheet({ open, onOpenChange, filters, onFiltersChange }: Props) {
  const [localFilters, setLocalFilters] = useState<JobFilters>(filters);

  const handleApply = () => {
    haptics.success();
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const toggleJobType = (type: string) => {
    haptics.selection();
    setLocalFilters(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter(t => t !== type)
        : [...prev.jobTypes, type],
    }));
  };

  const clearAll = () => {
    haptics.light();
    const empty: JobFilters = { query: '', jobTypes: [], location: '' };
    setLocalFilters(empty);
    onFiltersChange(empty);
  };

  const hasFilters = localFilters.query || localFilters.jobTypes.length > 0 || localFilters.location;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70dvh] rounded-t-3xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Search & Filter</SheetTitle>
            {hasFilters && (
              <button onClick={clearAll} className="text-xs text-primary">Clear all</button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or company..."
              value={localFilters.query}
              onChange={e => setLocalFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Location */}
          <Input
            placeholder="Location (e.g. San Francisco, Remote)"
            value={localFilters.location}
            onChange={e => setLocalFilters(prev => ({ ...prev, location: e.target.value }))}
          />

          {/* Job type chips */}
          <div>
            <p className="text-sm font-medium mb-2">Job Type</p>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={cn(
                    'px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 touch-manipulation',
                    localFilters.jobTypes.includes(type)
                      ? 'bg-primary text-primary-foreground'
                      : 'glass-input'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div>
              <p className="text-sm font-medium mb-2">Active Filters</p>
              <div className="flex flex-wrap gap-1.5">
                {localFilters.query && (
                  <Badge variant="secondary" className="gap-1">
                    "{localFilters.query}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setLocalFilters(prev => ({ ...prev, query: '' }))} />
                  </Badge>
                )}
                {localFilters.jobTypes.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleJobType(t)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleApply}
            className="w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-medium active:scale-95 transition-transform"
          >
            Apply Filters
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
