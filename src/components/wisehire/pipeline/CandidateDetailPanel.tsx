import { useState } from 'react';
import { X, Mail, FileText, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { KeyboardPipelineMover } from './KeyboardPipelineMover';
import { useCandidateHistory } from '@/hooks/wisehire/usePipeline';
import { PIPELINE_STAGES } from '@/hooks/wisehire/usePipeline';
import type { PipelineCandidate, PipelineStage } from '@/hooks/wisehire/usePipeline';
import { Link } from 'react-router-dom';

interface CandidateDetailPanelProps {
  candidate: PipelineCandidate;
  onClose: () => void;
  onMoveStage: (candidateId: string, toStage: PipelineStage, fromStage: PipelineStage) => void;
  onSaveNotes: (candidateId: string, notes: string) => void;
  isMutating?: boolean;
}

export function CandidateDetailPanel({
  candidate,
  onClose,
  onMoveStage,
  onSaveNotes,
  isMutating,
}: CandidateDetailPanelProps) {
  const [notes, setNotes] = useState(candidate.notes ?? '');
  const [notesDirty, setNotesDirty] = useState(false);
  const { data: events = [] } = useCandidateHistory(candidate.id);

  function handleNotesChange(v: string) {
    setNotes(v);
    setNotesDirty(v !== (candidate.notes ?? ''));
  }

  function handleSaveNotes() {
    onSaveNotes(candidate.id, notes);
    setNotesDirty(false);
  }

  const stageLabel = PIPELINE_STAGES.find((s) => s.id === candidate.pipeline_stage)?.label ?? candidate.pipeline_stage;
  const briefId = (candidate.brief as { id: string } | null)?.id;

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm truncate">{candidate.name}</h2>
          {candidate.email && (
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />{candidate.email}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Stage mover */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Pipeline Stage</p>
          <KeyboardPipelineMover
            currentStage={candidate.pipeline_stage}
            onMove={(toStage) => onMoveStage(candidate.id, toStage, candidate.pipeline_stage)}
            disabled={isMutating}
          />
        </div>

        {/* Brief link */}
        {briefId ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Brief</p>
            <Link
              to={`/wisehire/briefs/${briefId}`}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              View candidate brief
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Brief</p>
            <Link
              to="/wisehire/briefs"
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
            >
              + Generate brief for this candidate
            </Link>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Notes</p>
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={4}
            placeholder="Add hiring notes…"
            className="resize-none text-sm"
          />
          {notesDirty && (
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={isMutating}
              className="mt-2 h-7 text-xs bg-blue-700 hover:bg-blue-800 text-white"
            >
              {isMutating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Save notes
            </Button>
          )}
        </div>

        {/* History */}
        {events.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Stage History</p>
            <div className="space-y-2">
              {events.map((ev) => {
                const from = PIPELINE_STAGES.find((s) => s.id === ev.from_stage)?.label ?? ev.from_stage ?? '—';
                const to = PIPELINE_STAGES.find((s) => s.id === ev.to_stage)?.label ?? ev.to_stage;
                return (
                  <div key={ev.id} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{from} → {to}</span>
                    <span className="ml-auto text-slate-400 dark:text-slate-600">
                      {formatDistanceToNow(new Date(ev.moved_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Added {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </aside>
  );
}
