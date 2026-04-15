import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { useClients, type WiseHireClient } from '@/hooks/wisehire/useClients';
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
import { Building2, Plus, Mail, User, Pencil, Trash2, SearchX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientFormValues {
  name: string;
  contact_name: string;
  contact_email: string;
  notes: string;
}

const EMPTY: ClientFormValues = { name: '', contact_name: '', contact_email: '', notes: '' };

function ClientForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial: ClientFormValues;
  onSubmit: (v: ClientFormValues) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof ClientFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label className="text-xs">Client / Company name *</Label>
        <Input value={form.name} onChange={set('name')} placeholder="Acme Corp" className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Contact name</Label>
          <Input value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Contact email</Label>
          <Input value={form.contact_email} onChange={set('contact_email')} placeholder="jane@acme.com" className="h-8 text-sm" type="email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes (internal)</Label>
        <Textarea value={form.notes} onChange={set('notes')} placeholder="Hiring for backend engineers Q2…" rows={3} className="resize-none text-sm" />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={!form.name.trim() || isPending}>
          {isPending ? 'Saving…' : 'Save Client'}
        </Button>
      </div>
    </div>
  );
}

function ClientCard({
  client,
  onEdit,
  onDelete,
}: {
  client: WiseHireClient;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-sm">
            {client.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{client.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              {client.contact_name && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <User className="h-3 w-3" />{client.contact_name}
                </span>
              )}
              {client.contact_email && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3 w-3" />{client.contact_email}
                </span>
              )}
            </div>
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
      {client.notes && (
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 pl-[3.25rem]">
          {client.notes}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-400 pl-[3.25rem]">
        Added {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

export default function ClientsPage() {
  const { data: clients = [], isLoading, createClient, updateClient, deleteClient } = useClients();
  const [addOpen, setAddOpen] = useState(false);
  const [editClient, setEditClient] = useState<WiseHireClient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(values: ClientFormValues) {
    createClient.mutate(
      { name: values.name, contact_name: values.contact_name || undefined, contact_email: values.contact_email || undefined, notes: values.notes || undefined },
      { onSuccess: () => setAddOpen(false) },
    );
  }

  function handleUpdate(values: ClientFormValues) {
    if (!editClient) return;
    updateClient.mutate(
      { id: editClient.id, name: values.name, contact_name: values.contact_name || null, contact_email: values.contact_email || null, notes: values.notes || null },
      { onSuccess: () => setEditClient(null) },
    );
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteClient.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  }

  return (
    <WiseHireShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clients</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage the companies you recruit for and associate roles with clients.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <SearchX className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No clients yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Add your first client company to start associating roles and candidates with them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onEdit={() => setEditClient(c)}
                onDelete={() => setDeleteId(c.id)}
              />
            ))}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
            </DialogHeader>
            <ClientForm
              initial={EMPTY}
              onSubmit={handleCreate}
              isPending={createClient.isPending}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editClient} onOpenChange={(v) => { if (!v) setEditClient(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
            </DialogHeader>
            {editClient && (
              <ClientForm
                initial={{
                  name: editClient.name,
                  contact_name: editClient.contact_name ?? '',
                  contact_email: editClient.contact_email ?? '',
                  notes: editClient.notes ?? '',
                }}
                onSubmit={handleUpdate}
                isPending={updateClient.isPending}
                onCancel={() => setEditClient(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove client?</AlertDialogTitle>
              <AlertDialogDescription>
                This won't delete any associated roles or candidates — they'll just lose the client tag.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WiseHireShell>
  );
}
