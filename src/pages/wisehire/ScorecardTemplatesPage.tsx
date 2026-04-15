import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { useScorecardTemplates, type ScorecardTemplate } from '@/hooks/wisehire/useScorecardTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, Pencil, Trash2, SearchX, GripVertical, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TemplateFormValues {
  title: string;
  description: string;
  questions: string[];
}

const EMPTY: TemplateFormValues = { title: '', description: '', questions: [''] };

function TemplateForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial: TemplateFormValues;
  onSubmit: (v: TemplateFormValues) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TemplateFormValues>(initial);

  function setTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, title: e.target.value }));
  }
  function setDesc(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, description: e.target.value }));
  }
  function setQ(i: number, v: string) {
    setForm((f) => {
      const qs = [...f.questions];
      qs[i] = v;
      return { ...f, questions: qs };
    });
  }
  function addQ() {
    setForm((f) => ({ ...f, questions: [...f.questions, ''] }));
  }
  function removeQ(i: number) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
  }

  const filledQuestions = form.questions.filter((q) => q.trim());
  const canSubmit = form.title.trim().length >= 2 && filledQuestions.length >= 1;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ ...form, questions: filledQuestions });
  }

  return (
    <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label className="text-xs">Template name *</Label>
        <Input value={form.title} onChange={setTitle} placeholder="e.g. Senior Engineer Interview" className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Textarea value={form.description} onChange={setDesc} placeholder="When to use this template…" rows={2} className="resize-none text-sm" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Interview questions *</Label>
          <span className="text-[10px] text-muted-foreground">{filledQuestions.length} question{filledQuestions.length !== 1 ? 's' : ''}</span>
        </div>
        {form.questions.map((q, i) => (
          <div key={i} className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-slate-300 mt-1.5 shrink-0" />
            <Input
              value={q}
              onChange={(e) => setQ(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
              className="h-8 text-sm flex-1"
            />
            {form.questions.length > 1 && (
              <button onClick={() => removeQ(i)} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors mt-0.5 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={addQ} type="button">
          <Plus className="h-3.5 w-3.5" />
          Add question
        </Button>
      </div>

      <div className="flex gap-2 justify-end pt-1 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
          {isPending ? 'Saving…' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: ScorecardTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{template.title}</p>
            {template.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
          </Button>
        </div>
      </div>

      <div className="mt-3 pl-12 space-y-1">
        {template.questions.slice(0, 3).map((q, i) => (
          <p key={i} className="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="text-slate-400 mr-1">{i + 1}.</span>{q}
          </p>
        ))}
        {template.questions.length > 3 && (
          <p className="text-xs text-slate-400">+{template.questions.length - 3} more questions</p>
        )}
      </div>

      <p className="mt-2 text-[10px] text-slate-400 pl-12">
        {template.questions.length} question{template.questions.length !== 1 ? 's' : ''} ·{' '}
        Updated {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
      </p>
    </div>
  );
}

export default function ScorecardTemplatesPage() {
  const { data: templates = [], isLoading, createTemplate, updateTemplate, deleteTemplate } = useScorecardTemplates();
  const [addOpen, setAddOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ScorecardTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(values: TemplateFormValues) {
    createTemplate.mutate(
      { title: values.title, description: values.description || undefined, questions: values.questions },
      { onSuccess: () => setAddOpen(false) },
    );
  }

  function handleUpdate(values: TemplateFormValues) {
    if (!editTemplate) return;
    updateTemplate.mutate(
      { id: editTemplate.id, title: values.title, description: values.description || null, questions: values.questions },
      { onSuccess: () => setEditTemplate(null) },
    );
  }

  return (
    <WiseHireShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scorecard Templates</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Reusable sets of interview questions. Apply a template when starting a scorecard.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <SearchX className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No templates yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Create a template with your standard interview questions to reuse across candidates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={() => setEditTemplate(t)}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
          <TemplateForm initial={EMPTY} onSubmit={handleCreate} isPending={createTemplate.isPending} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTemplate} onOpenChange={(v) => { if (!v) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {editTemplate && (
            <TemplateForm
              initial={{ title: editTemplate.title, description: editTemplate.description ?? '', questions: editTemplate.questions.length ? editTemplate.questions : [''] }}
              onSubmit={handleUpdate}
              isPending={updateTemplate.isPending}
              onCancel={() => setEditTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. Existing scorecards won't be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteTemplate.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WiseHireShell>
  );
}
