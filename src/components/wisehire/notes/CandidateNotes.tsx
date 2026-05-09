import { useState } from 'react';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { Pin, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useCandidateNotes,
  useAddNote,
  useDeleteNote,
  useTogglePinNote,
  type NoteTag,
} from '@/hooks/wisehire/useCandidateNotes';
import { NoteTagBadge } from './NoteTag';

interface Props {
  candidateId: string;
}

const TAGS: NoteTag[] = ['general', 'highlight', 'concern'];

export function CandidateNotes({ candidateId }: Props) {
  const { data: notes = [], isLoading } = useCandidateNotes(candidateId);
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const pinNote = useTogglePinNote();

  const [body, setBody] = useState('');
  const [tag, setTag] = useState<NoteTag>('general');

  function handleAdd() {
    if (!body.trim()) return;
    addNote.mutate(
      { candidateId, body, tag },
      { onSuccess: () => { setBody(''); setTag('general'); } },
    );
  }

  return (
    <div className="space-y-3">
      {/* Compose */}
      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a team note…"
          rows={3}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {TAGS.map((t) => (
              <NoteTagBadge key={t} tag={t} onClick={() => setTag(t)} active={tag === t} />
            ))}
          </div>
          <Button
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={handleAdd}
            disabled={!body.trim() || addNote.isPending}
          >
            {addNote.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Add note
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-slate-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No notes yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'rounded-lg p-3 text-xs border',
                note.pinned
                  ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
              )}
            >
              <div className="flex items-start gap-2">
                <p className="flex-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {note.body}
                </p>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => pinNote.mutate({ noteId: note.id, candidateId, pinned: note.pinned })}
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      note.pinned
                        ? 'text-amber-500'
                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-400',
                    )}
                    title={note.pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteNote.mutate({ noteId: note.id, candidateId })}
                    className="p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <NoteTagBadge tag={note.tag as NoteTag} />
                <span className="text-slate-400 dark:text-slate-500 ml-auto">
                  {safeFormatDistanceToNow(note.created_at, { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
