import { useState } from 'react';
import { format } from 'date-fns';
import { Camera, Clock, RotateCcw, Trash2, Plus, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useResumeSnapshots, useSaveResumeSnapshot, useDeleteResumeSnapshot, type ResumeSnapshot } from '@/hooks/useResumeSnapshots';
import type { ResumeData } from '@/types/resume';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface ResumeSnapshotsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentResume: ResumeData | null;
  currentResumeId: string | null;
  currentAtsScore?: number;
  /** Called when the user restores a snapshot. The parent should create a new resume record from
   * the provided data — never overwrite the current live resume. */
  onRestoreAsNew?: (resume: ResumeData) => Promise<void>;
}

/** Parse snapshot JSON into a typed ResumeData, returning null if the shape is wrong. */
function parseSnapshotData(json: Json): ResumeData | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  if (!obj.contactInfo || typeof obj.contactInfo !== 'object') return null;
  return obj as unknown as ResumeData;
}

function SnapshotSummary({ resume }: { resume: ResumeData | null }) {
  if (!resume) return <p className="text-xs text-muted-foreground italic">Unable to preview snapshot data.</p>;

  const name = resume.contactInfo?.fullName || 'Unnamed';
  const expCount = resume.experience?.length ?? 0;
  const eduCount = resume.education?.length ?? 0;
  const skillsCount = resume.skills?.length ?? 0;

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p className="font-medium text-foreground text-sm">{name}</p>
      {resume.summary && (
        <p className="line-clamp-2">{resume.summary}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {expCount > 0 && <span className="bg-muted px-2 py-0.5 rounded-md">{expCount} experience{expCount !== 1 ? 's' : ''}</span>}
        {eduCount > 0 && <span className="bg-muted px-2 py-0.5 rounded-md">{eduCount} education</span>}
        {skillsCount > 0 && <span className="bg-muted px-2 py-0.5 rounded-md">{skillsCount} skills</span>}
      </div>
    </div>
  );
}

function SnapshotCard({
  snapshot,
  onRestore,
  onDelete,
  isRestoring,
}: {
  snapshot: ResumeSnapshot;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseSnapshotData(snapshot.resume_json);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{snapshot.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                {format(new Date(snapshot.created_at), 'MMM d, yyyy · h:mm a')}
              </p>
            </div>
          </div>
          {snapshot.ats_score != null && (
            <Badge variant="outline" className="text-xs shrink-0">
              ATS {snapshot.ats_score}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="w-3 h-3" />
            Preview
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label="Delete snapshot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={onRestore}
            disabled={isRestoring}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {isRestoring ? 'Creating…' : 'Restore as Copy'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/30">
          <SnapshotSummary resume={parsed} />
        </div>
      )}
    </div>
  );
}

export function ResumeSnapshotsSheet({
  open,
  onOpenChange,
  currentResume,
  currentResumeId,
  currentAtsScore,
  onRestoreAsNew,
}: ResumeSnapshotsSheetProps) {
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: snapshots = [], isLoading } = useResumeSnapshots(currentResumeId);
  const saveSnapshot = useSaveResumeSnapshot();
  const deleteSnapshot = useDeleteResumeSnapshot();

  const handleSave = () => {
    if (!saveName.trim() || !currentResume) return;
    saveSnapshot.mutate({
      resume_id: currentResumeId || undefined,
      name: saveName.trim(),
      resume_json: currentResume as unknown as Json,
      ats_score: currentAtsScore,
    }, {
      onSuccess: () => {
        setSaveName('');
        setShowSaveForm(false);
      },
    });
  };

  const handleRestore = async (snapshot: ResumeSnapshot) => {
    if (!onRestoreAsNew) {
      toast.error('Restore is not available');
      return;
    }
    const parsed = parseSnapshotData(snapshot.resume_json);
    if (!parsed) {
      toast.error('Could not read snapshot data — it may be corrupted');
      return;
    }
    setRestoringId(snapshot.id);
    try {
      await onRestoreAsNew(parsed);
      onOpenChange(false);
    } catch (err) {
      console.error('[ResumeSnapshots] restore failed:', err);
      toast.error('Failed to restore snapshot — please try again');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <SheetTitle>Resume Snapshots</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Save named copies of your resume at any point. Restoring a snapshot creates a new resume — your current work is never overwritten.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Save form */}
          {showSaveForm ? (
            <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Name this snapshot</p>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder='e.g. "Before Tailor" or "Google v2"'
                className="min-h-[44px]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!saveName.trim() || saveSnapshot.isPending}
                  className="flex-1 min-h-[40px]"
                  size="sm"
                >
                  {saveSnapshot.isPending ? 'Saving…' : 'Save Snapshot'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[40px]"
                  onClick={() => { setShowSaveForm(false); setSaveName(''); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full min-h-[44px] border-dashed"
              onClick={() => setShowSaveForm(true)}
              disabled={!currentResume}
            >
              <Plus className="w-4 h-4 mr-2" />
              Save Current Version
            </Button>
          )}

          {/* Snapshot list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Camera className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">No snapshots yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Save a snapshot before making big changes so you can always go back.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  isRestoring={restoringId === snapshot.id}
                  onRestore={() => handleRestore(snapshot)}
                  onDelete={() => deleteSnapshot.mutate(snapshot.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
