import { useMemo, useRef, useState } from 'react';
import { PipelineColumn } from './PipelineColumn';
import { CandidateCard } from './CandidateCard';
import { CandidateDetailPanel } from './CandidateDetailPanel';
import { AddCandidateSheet } from './AddCandidateSheet';
import { PipelineSkeleton } from './PipelineSkeleton';
import { createDragHandlers, DragState } from '@/lib/wisehire/pipelineDragDrop';
import { usePipeline, PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';
import type { PipelineCandidate, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, UserPlus, CheckSquare, X, ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PipelineBoardProps {
  roleId?: string;
  clientId?: string;
  roles: { id: string; title: string }[];
  biasMode?: boolean;
}

function exportPipelineCSV(candidates: PipelineCandidate[]) {
  const STAGE_LABELS: Record<string, string> = {
    shortlisted: 'Shortlisted', contacted: 'Contacted', interviewing: 'Interviewing',
    offer_sent: 'Offer Sent', hired: 'Hired', rejected: 'Rejected',
  };
  const headers = ['Name', 'Email', 'Stage', 'Role', 'Match Score (%)', 'Date Added'];
  const rows = candidates.map((c) => [
    c.name,
    c.email ?? '',
    STAGE_LABELS[c.pipeline_stage] ?? c.pipeline_stage,
    c.role?.title ?? '',
    c.brief?.match_score?.toString() ?? '',
    new Date(c.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pipeline_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PipelineBoard({ roleId, clientId, roles, biasMode = false }: PipelineBoardProps) {
  const { data: candidates = [], isLoading, updatePipelineStage, bulkUpdatePipelineStage, updateNotes, addCandidate } = usePipeline(roleId, clientId);
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string | undefined>(undefined);
  const dragState = useRef<DragState>({ candidateId: null, fromStage: null });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<string>('');

  // Mobile: track which stage sections are collapsed (default: all expanded)
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  function toggleCollapsedStage(stageId: string) {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  function openAddSheet(stageId?: string) {
    setDefaultStage(stageId);
    setShowAddSheet(true);
  }

  // Memoize the stage->candidates bucketing so it doesn't rebuild on every
  // unrelated re-render (card click, hover, selection toggle). Only recompute
  // when the candidates list itself changes.
  const stageMap = useMemo(() => {
    const map: Record<string, PipelineCandidate[]> = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s.id, [] as PipelineCandidate[]]),
    );
    for (const c of candidates) {
      const stage = c.pipeline_stage in map ? c.pipeline_stage : 'shortlisted';
      map[stage].push(c);
    }
    return map;
  }, [candidates]);

  const dragHandlers = createDragHandlers(dragState, (candidateId, toStage) => {
    if (selectionMode) return;
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    updatePipelineStage.mutate({
      candidateId,
      toStage: toStage as PipelineStage,
      fromStage: candidate.pipeline_stage,
    });
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, pipeline_stage: toStage as PipelineStage });
    }
  });

  function handleMoveStage(candidateId: string, toStage: PipelineStage, fromStage: PipelineStage) {
    updatePipelineStage.mutate({ candidateId, toStage, fromStage });
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate({ ...selectedCandidate, pipeline_stage: toStage });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkTargetStage('');
  }

  function handleBulkMove() {
    if (!bulkTargetStage || selectedIds.size === 0) return;
    const stageLabel = PIPELINE_STAGES.find((s) => s.id === bulkTargetStage)?.label ?? bulkTargetStage;
    const movableIds = Array.from(selectedIds).filter((id) => {
      const candidate = candidates.find((c) => c.id === id);
      return candidate && candidate.pipeline_stage !== bulkTargetStage;
    });
    if (movableIds.length === 0) {
      toast.info(`All selected candidates are already in ${stageLabel}`);
      exitSelectionMode();
      return;
    }
    bulkUpdatePipelineStage.mutate(
      { candidateIds: movableIds, toStage: bulkTargetStage as PipelineStage },
      {
        onSuccess: () => {
          toast.success(`Moved ${movableIds.length} candidate${movableIds.length === 1 ? '' : 's'} to ${stageLabel}`);
        },
      },
    );
    exitSelectionMode();
  }

  function handleBulkReject() {
    const rejectableIds = Array.from(selectedIds).filter((id) => {
      const candidate = candidates.find((c) => c.id === id);
      return candidate && candidate.pipeline_stage !== 'rejected';
    });
    if (rejectableIds.length === 0) {
      toast.info('All selected candidates are already rejected');
      exitSelectionMode();
      return;
    }
    bulkUpdatePipelineStage.mutate(
      { candidateIds: rejectableIds, toStage: 'rejected' },
      {
        onSuccess: () => {
          toast.success(`Rejected ${rejectableIds.length} candidate${rejectableIds.length === 1 ? '' : 's'}`);
        },
      },
    );
    exitSelectionMode();
  }

  if (isLoading) return <PipelineSkeleton />;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {selectionMode ? (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 text-xs">
              Select all ({candidates.length})
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs">
                Clear
              </Button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <Select value={bulkTargetStage} onValueChange={setBulkTargetStage}>
                <SelectTrigger className="h-8 text-xs w-36 gap-1">
                  <ChevronDown className="h-3 w-3" />
                  <SelectValue placeholder="Move to…" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.filter((s) => s.id !== 'rejected').map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white"
                disabled={!bulkTargetStage || selectedIds.size === 0 || updatePipelineStage.isPending || bulkUpdatePipelineStage.isPending}
                onClick={handleBulkMove}
              >
                Move
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={selectedIds.size === 0 || updatePipelineStage.isPending || bulkUpdatePipelineStage.isPending}
                onClick={handleBulkReject}
              >
                Reject
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={exitSelectionMode}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              {candidates.length > 1 && (
                <Button
                  variant="outline"
                  onClick={() => { setSelectionMode(true); setSelectedCandidate(null); }}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select
                </Button>
              )}
              {candidates.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => exportPipelineCSV(candidates)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              )}
              <Button
                onClick={() => openAddSheet()}
                className="bg-blue-700 hover:bg-blue-800 text-white h-8 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Candidate
              </Button>
            </div>
          </>
        )}
      </div>

      {/*
       * Content area: flex-col on mobile, flex-row on desktop.
       * This allows CandidateDetailPanel to sit as a flex-row sibling on desktop
       * (md:relative md:w-80 participates in the row) while using position:fixed
       * on mobile where it's a full-height right-side overlay.
       */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-0">

        {/* Board — takes remaining width */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* ── Mobile layout (< md): vertically stacked collapsible sections ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {PIPELINE_STAGES.map((stage) => {
              const stageCandidates = stageMap[stage.id] ?? [];
              const isExpanded = !collapsedStages.has(stage.id);
              return (
                <div
                  key={stage.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  {/* Collapsible header */}
                  <button
                    type="button"
                    onClick={() => toggleCollapsedStage(stage.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40 text-left"
                  >
                    <span className={cn('text-sm font-semibold', stage.color.split(' ').slice(-2).join(' '))}>
                      {stage.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">
                        {stageCandidates.length}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-slate-400 transition-transform duration-200',
                          !isExpanded && '-rotate-90',
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {stageCandidates.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                          No candidates in this stage
                        </p>
                      ) : (
                        stageCandidates.map((c) => (
                          <CandidateCard
                            key={c.id}
                            candidate={c}
                            onClick={() => {
                              if (selectionMode) return;
                              setSelectedCandidate(c.id === selectedCandidate?.id ? null : c);
                            }}
                            onDragStart={dragHandlers.onDragStart(c.id, stage.id)}
                            onDragEnd={dragHandlers.onDragEnd()}
                            biasMode={biasMode}
                            selectionMode={selectionMode}
                            selected={selectedIds.has(c.id)}
                            onToggleSelect={toggleSelect}
                          />
                        ))
                      )}
                      {/* Per-section add button on mobile */}
                      {!selectionMode && (
                        <button
                          type="button"
                          onClick={() => openAddSheet(stage.id)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2.5 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add to {stage.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Desktop layout (md+): horizontal Kanban columns ── */}
          <div className="hidden md:flex gap-3 overflow-x-auto pb-2 flex-1 min-h-0">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                candidates={stageMap[stage.id] ?? []}
                onCandidateClick={(c) => {
                  if (selectionMode) return;
                  setSelectedCandidate(c.id === selectedCandidate?.id ? null : c);
                }}
                dragHandlers={dragHandlers}
                biasMode={biasMode}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onAddClick={() => openAddSheet(stage.id)}
              />
            ))}
          </div>

        </div>

        {/* CandidateDetailPanel — sibling to the board div in the flex row.
            On desktop (md:relative md:w-80): participates in the flex row as right rail.
            On mobile (fixed inset-y-0 right-0 z-50): full-height overlay with backdrop. */}
        {!selectionMode && selectedCandidate && (
          <CandidateDetailPanel
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            onMoveStage={handleMoveStage}
            onSaveNotes={(id, notes) => updateNotes.mutate({ candidateId: id, notes })}
            isMutating={updatePipelineStage.isPending || updateNotes.isPending}
          />
        )}

      </div>

      <AddCandidateSheet
        open={showAddSheet}
        onClose={() => { setShowAddSheet(false); setDefaultStage(undefined); }}
        roles={roles}
        defaultRoleId={roleId}
        defaultStage={defaultStage}
        onAdd={async ({ name, email, roleId: rId, stage }) => {
          await addCandidate.mutateAsync({ name, email, roleId: rId, stage });
        }}
      />
    </div>
  );
}
