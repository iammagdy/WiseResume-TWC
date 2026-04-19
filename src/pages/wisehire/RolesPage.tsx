import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { useRoles, ROLE_STATUSES, type RoleWithStats } from '@/hooks/wisehire/useRoles';
import { useClients } from '@/hooks/wisehire/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Briefcase, Plus, Pencil, Trash2, Users, FileText, Building2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: string }) {
  const s = ROLE_STATUSES.find((r) => r.value === status) ?? ROLE_STATUSES[0];
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', s.color)}>
      {s.label}
    </span>
  );
}

interface EditDialogProps {
  role: RoleWithStats | null;
  clients: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onSave: (updates: { title: string; status: string; client_id: string | null }) => void;
  isSaving: boolean;
}

function EditDialog({ role, clients, open, onClose, onSave, isSaving }: EditDialogProps) {
  const [title, setTitle] = useState(role?.title ?? '');
  const [status, setStatus] = useState(role?.status ?? 'draft');
  const [clientId, setClientId] = useState<string>(role?.client_id ?? 'none');

  function handleOpen(isOpen: boolean) {
    if (isOpen && role) {
      setTitle(role.title);
      setStatus(role.status);
      setClientId(role.client_id ?? 'none');
    }
    if (!isOpen) onClose();
  }

  function handleSave() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    onSave({ title: title.trim(), status, client_id: clientId === 'none' ? null : clientId });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateDialogProps {
  clients: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; clientId?: string }) => void;
  isCreating: boolean;
}

function CreateDialog({ clients, open, onClose, onCreate, isCreating }: CreateDialogProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('none');

  function handleOpen(isOpen: boolean) {
    if (isOpen) { setTitle(''); setClientId('none'); }
    if (!isOpen) onClose();
  }

  function handleCreate() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    onCreate({ title: title.trim(), clientId: clientId === 'none' ? undefined : clientId });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label>Client (optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const { data: roles = [], isLoading, updateRole, createRole, deleteRole } = useRoles();
  const { data: clients = [] } = useClients();

  const [editingRole, setEditingRole] = useState<RoleWithStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all' ? roles : roles.filter((r) => r.status === statusFilter);

  function handleStatusChange(roleId: string, newStatus: string) {
    updateRole.mutate({ roleId, updates: { status: newStatus } });
  }

  function handleClientChange(roleId: string, newClientId: string) {
    updateRole.mutate({ roleId, updates: { client_id: newClientId === 'none' ? null : newClientId } });
  }

  function handleDelete(roleId: string) {
    if (confirmDeleteId === roleId) {
      deleteRole.mutate(roleId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(roleId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  return (
    <WiseHireShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Roles</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage open, filled, and archived roles across all clients.
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white h-9 text-sm font-semibold self-start sm:self-auto shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Role
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', ...ROLE_STATUSES.map((s) => s.value)].map((v) => {
            const label = v === 'all' ? 'All' : ROLE_STATUSES.find((s) => s.value === v)?.label ?? v;
            const count = v === 'all' ? roles.length : roles.filter((r) => r.status === v).length;
            return (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={cn(
                  'text-xs font-medium px-3 py-1 rounded-full transition-colors border',
                  statusFilter === v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700',
                )}
              >
                {label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 mb-3">
              <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {statusFilter === 'all' ? 'No roles yet' : `No ${ROLE_STATUSES.find((s) => s.value === statusFilter)?.label ?? ''} roles`}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Create a role to start tracking candidates and pipeline.
            </p>
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-blue-700 hover:bg-blue-800 text-white">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Role
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[1fr_140px_160px_100px_80px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <span>Role</span>
              <span>Status</span>
              <span>Client</span>
              <span>Candidates</span>
              <span>JD</span>
              <span></span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col md:grid md:grid-cols-[1fr_140px_160px_100px_80px_80px] gap-2 md:gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Title + created */}
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{role.title}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatDistanceToNow(new Date(role.updated_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status selector */}
                  <div className="flex items-center">
                    <Select
                      value={role.status}
                      onValueChange={(v) => handleStatusChange(role.id, v)}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 shadow-none px-0 focus:ring-0 w-auto gap-1">
                        <StatusBadge status={role.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client selector */}
                  <div className="flex items-center">
                    {clients.length > 0 ? (
                      <Select
                        value={role.client_id ?? 'none'}
                        onValueChange={(v) => handleClientChange(role.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 shadow-none px-0 focus:ring-0 w-full gap-1 truncate">
                          <SelectValue>
                            {role.client_id ? (
                              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{clientMap[role.client_id] ?? 'Unknown'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">No client</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No client</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </div>

                  {/* Candidate count */}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{role.active_count}</span>
                    {role.candidate_count > role.active_count && (
                      <span className="text-xs text-slate-400">/ {role.candidate_count}</span>
                    )}
                  </div>

                  {/* JD indicator */}
                  <div className="flex items-center">
                    {role.jd_text ? (
                      <Link
                        to={`/wisehire/jd-writer?roleId=${role.id}`}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingRole(role)}
                      title="Edit role"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 w-7 p-0',
                        confirmDeleteId === role.id ? 'text-red-500' : 'text-slate-400 hover:text-red-500',
                      )}
                      onClick={() => handleDelete(role.id)}
                      title={confirmDeleteId === role.id ? 'Click again to confirm' : 'Archive role'}
                      disabled={deleteRole.isPending}
                    >
                      {deleteRole.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EditDialog
        role={editingRole}
        clients={clients}
        open={!!editingRole}
        onClose={() => setEditingRole(null)}
        isSaving={updateRole.isPending}
        onSave={(updates) => {
          if (!editingRole) return;
          updateRole.mutate(
            { roleId: editingRole.id, updates },
            { onSuccess: () => setEditingRole(null) },
          );
        }}
      />

      <CreateDialog
        clients={clients}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        isCreating={createRole.isPending}
        onCreate={(data) => {
          createRole.mutate(data, { onSuccess: () => setShowCreate(false) });
        }}
      />
    </WiseHireShell>
  );
}
