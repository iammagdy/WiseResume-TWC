import { useRef, useState } from 'react';
import { PipelineColumn } from './PipelineColumn';
import { CandidateDetailPanel } from './CandidateDetailPanel';
import { AddCandidateSheet } from './AddCandidateSheet';
import { PipelineSkeleton } from './PipelineSkeleton';
import { createDragHandlers, DragState } from '@/lib/wisehire/pipelineDragDrop';
import { usePipeline, PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';
import type { PipelineCandidate, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { Button } from '@/components/ui/button';
import { Download, UserPlus } from 'lucide-react';

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

  const stageMap = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, [] as PipelineCandidate[]]));
  for (const c of candidates) {
    const stage = c.pipeline_stage in stageMap ? c.pipeline_stage : 'shortlisted';
    stageMap[stage].push(c);
  }

  const dragHandlers = createDragHandlers(dragState, (candidateId, toStage) => {
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

  if (isLoading) return <PipelineSkeleton />;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Board + detail panel */}
      <div className="flex gap-0 flex-1 min-h-0 relative">
        <div className="flex gap-3 overflow-x-auto pb-2 flex-1">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              candidates={stageMap[stage.id] ?? []}
              onCandidateClick={(c) => setSelectedCandidate(c.id === selectedCandidate?.id ? null : c)}
              dragHandlers={dragHandlers}
              biasMode={biasMode}
            />
          ))}
        </div>

        {/* Slide-in detail panel */}
        {selectedCandidate && (
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
