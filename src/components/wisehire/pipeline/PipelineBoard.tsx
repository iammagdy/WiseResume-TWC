import { useRef, useState } from 'react';
import { PipelineColumn } from './PipelineColumn';
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
import { Download, UserPlus, CheckSquare, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

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
  const { data: candidates = [], isLoading, updatePipelineStage, updateNotes, addCandidate } = usePipeline(roleId, clientId);
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const dragState = useRef<DragState>({ candidateId: null, fromStage: null });

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<string>('');

  const stageMap = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, [] as PipelineCandidate[]]));
  for (const c of candidates) {
    const stage = c.pipeline_stage in stageMap ? c.pipeline_stage : 'shortlisted';
    stageMap[stage].push(c);
  }

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
    let moved = 0;
    for (const id of selectedIds) {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate || candidate.pipeline_stage === bulkTargetStage) continue;
      updatePipelineStage.mutate({
        candidateId: id,
        toStage: bulkTargetStage as PipelineStage,
        fromStage: candidate.pipeline_stage,
      });
      moved++;
    }
    if (moved === 0) {
      toast.info(`All selected candidates are already in ${stageLabel}`);
    } else {
      toast.success(`Moved ${moved} candidate${moved === 1 ? '' : 's'} to ${stageLabel}`);
    }
    exitSelectionMode();
  }

  function handleBulkReject() {
    let rejected = 0;
    for (const id of selectedIds) {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate || candidate.pipeline_stage === 'rejected') continue;
      updatePipelineStage.mutate({
        candidateId: id,
        toStage: 'rejected',
        fromStage: candidate.pipeline_stage,
      });
      rejected++;
    }
    if (rejected === 0) {
      toast.info('All selected candidates are already rejected');
    } else {
      toast.success(`Rejected ${rejected} candidate${rejected === 1 ? '' : 's'}`);
    }
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
                disabled={!bulkTargetStage || selectedIds.size === 0 || updatePipelineStage.isPending}
                onClick={handleBulkMove}
              >
                Move
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={selectedIds.size === 0 || updatePipelineStage.isPending}
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
                onClick={() => setShowAddSheet(true)}
                className="bg-blue-700 hover:bg-blue-800 text-white h-8 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Candidate
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Board + detail panel */}
      <div className="flex gap-0 flex-1 min-h-0 relative">
        <div className="flex gap-3 overflow-x-auto pb-2 flex-1">
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
            />
          ))}
        </div>

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
        onClose={() => setShowAddSheet(false)}
        roles={roles}
        defaultRoleId={roleId}
        onAdd={async ({ name, email, roleId: rId }) => {
          await addCandidate.mutateAsync({ name, email, roleId: rId });
        }}
      />
    </div>
  );
}
