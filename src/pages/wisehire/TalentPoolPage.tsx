import { useState, useCallback } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { TalentPoolSkeleton } from '@/components/wisehire/talent-pool/TalentPoolSkeleton';
import { TalentSearchFilters as TalentFilters } from '@/components/wisehire/talent-pool/TalentSearchFilters';
import { TalentProfileCard } from '@/components/wisehire/talent-pool/TalentProfileCard';
import { useTalentSearch, useRecordTalentView, useAddTalentToPool, type TalentProfile, type TalentSearchFilters } from '@/hooks/wisehire/useTalentPool';
import { Users, SearchX } from 'lucide-react';

const DEFAULT_FILTERS: TalentSearchFilters = { limit: 20 };

export default function TalentPoolPage() {
  const [filters, setFilters] = useState<TalentSearchFilters>(DEFAULT_FILTERS);
  const { data, isLoading, isFetching } = useTalentSearch(filters);
  const recordView = useRecordTalentView();
  const addToPool = useAddTalentToPool();

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  const results: TalentProfile[] = data?.results ?? [];

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
    (profile: TalentProfile) => {
      recordView.mutate(profile.id);
    },
    [recordView],
  );

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Talent Pool</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse candidates who have opted in to recruiter visibility on WiseResume.
          </p>
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
    </WiseHireShell>
  );
}
