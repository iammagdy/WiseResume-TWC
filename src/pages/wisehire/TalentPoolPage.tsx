import { useState, useCallback } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { TalentPoolSkeleton } from '@/components/wisehire/talent-pool/TalentPoolSkeleton';
import { TalentSearchFilters as TalentFilters } from '@/components/wisehire/talent-pool/TalentSearchFilters';
import { TalentProfileCard } from '@/components/wisehire/talent-pool/TalentProfileCard';
import {
  useTalentSearch, useRecordTalentView, useAddTalentToPool,
  type TalentProfile, type TalentSearchFilters,
} from '@/hooks/wisehire/useTalentPool';
import { useSavedSearches } from '@/hooks/wisehire/useSavedSearches';
import { Users, SearchX, Bookmark, BookmarkCheck, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DEFAULT_FILTERS: TalentSearchFilters = { limit: 20 };

function isNonDefault(f: TalentSearchFilters): boolean {
  return !!(f.query || f.skills?.length || f.experience_level || f.availability || f.remote_ok !== undefined);
}

export default function TalentPoolPage() {
  const [filters, setFilters] = useState<TalentSearchFilters>(DEFAULT_FILTERS);
  const { data, isLoading, isFetching } = useTalentSearch(filters);
  const recordView = useRecordTalentView();
  const addToPool = useAddTalentToPool();

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const { data: savedSearches = [], saveSearch, deleteSearch } = useSavedSearches();

  const results: TalentProfile[] = data?.results ?? [];
  const canSave = isNonDefault(filters);

  const handleFilterChange = useCallback((partial: Partial<TalentSearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleAdd = useCallback(
    (profile: TalentProfile, stage: string) => {
      setAddingId(profile.id);
      addToPool.mutate(
        { profile, stage },
        {
          onSuccess: () => {
            setAddedIds((prev) => new Set([...prev, profile.id]));
            setAddingId(null);
          },
          onError: () => setAddingId(null),
        },
      );
    },
    [addToPool],
  );

  const handleView = useCallback(
    (profile: TalentProfile) => { recordView.mutate(profile.id); },
    [recordView],
  );

  function handleSaveSearch() {
    if (!saveName.trim()) return;
    saveSearch.mutate(
      { name: saveName.trim(), filters },
      { onSuccess: () => { setSaveDialogOpen(false); setSaveName(''); } },
    );
  }

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Talent Pool</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse candidates who have opted in to recruiter visibility on WiseResume.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {savedSearches.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    Saved searches
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  {savedSearches.map((s) => (
                    <div key={s.id} className="flex items-center pr-1">
                      <DropdownMenuItem
                        onClick={() => setFilters({ ...DEFAULT_FILTERS, ...s.filters })}
                        className="flex-1 cursor-pointer truncate"
                      >
                        {s.name}
                      </DropdownMenuItem>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSearch.mutate(s.id); }}
                        className="p-1.5 rounded hover:text-red-500 text-muted-foreground shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setSaveName(''); setSaveDialogOpen(true); }}
                    disabled={!canSave}
                    className="gap-1.5"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    Save current search…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : canSave ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => { setSaveName(''); setSaveDialogOpen(true); }}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save search
              </Button>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <TalentFilters filters={filters} onChange={handleFilterChange} onReset={handleReset} />

        {/* Count badge */}
        {!isLoading && (
          <p className="text-xs text-slate-400">
            {isFetching ? 'Searching…' : `${results.length} candidate${results.length === 1 ? '' : 's'} found`}
            {data?.remaining !== undefined && (
              <span className="ml-2 text-slate-300 dark:text-slate-600">· {data.remaining} searches left today</span>
            )}
          </p>
        )}

        {/* Results */}
        {isLoading ? (
          <TalentPoolSkeleton />
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SearchX className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No candidates match your filters</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try broadening your search or check back as more candidates opt in.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {results.map((p) => (
              <TalentProfileCard
                key={p.id}
                profile={p}
                onAddToPipeline={handleAdd}
                adding={addingId === p.id}
                added={addedIds.has(p.id)}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save search dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Senior React Engineers – Remote"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSearch} disabled={!saveName.trim() || saveSearch.isPending}>
                {saveSearch.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </WiseHireShell>
  );
}
