import { useState } from 'react';
import { FileText, Copy, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { WiseHireRole } from '@/hooks/wisehire/useJDs';
import { toast } from 'sonner';

interface JDLibraryProps {
  roles: WiseHireRole[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function JDLibrary({ roles, isLoading, onDelete, isDeleting }: JDLibraryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCopy(jdText: string, id: string) {
    await navigator.clipboard.writeText(jdText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard.');
  }

  function handleDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 mb-3">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No saved JDs yet</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Generate your first job description to see it here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {roles.map((role) => (
        <div key={role.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{role.title}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatDistanceToNow(new Date(role.updated_at), { addSuffix: true })}
              {role.jd_text && ` · ${role.jd_text.split('\n').length} lines`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => role.jd_text && handleCopy(role.jd_text, role.id)}
              disabled={!role.jd_text}
              title="Copy"
            >
              {copiedId === role.id
                ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${confirmDeleteId === role.id ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
              onClick={() => handleDeleteClick(role.id)}
              disabled={isDeleting}
              title={confirmDeleteId === role.id ? 'Click again to confirm' : 'Delete'}
            >
              {isDeleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
