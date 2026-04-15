import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { PipelineBoard } from '@/components/wisehire/pipeline/PipelineBoard';
import { useJDs } from '@/hooks/wisehire/useJDs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';

export default function PipelinePage() {
  const { data: roles = [], isLoading: rolesLoading } = useJDs();
  const [filterRoleId, setFilterRoleId] = useState<string>('all');

  const rolesForBoard = roles.map((r) => ({ id: r.id, title: r.title }));

  return (
    <WiseHireShell>
      <div className="flex flex-col h-full px-4 py-8 gap-6 max-w-full">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Candidate Pipeline
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Drag and drop candidates across stages. Click a card to view details.
            </p>
          </div>

          {/* Role filter */}
          {!rolesLoading && roles.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Layers className="h-4 w-4 text-slate-400 shrink-0" />
              <Select value={filterRoleId} onValueChange={setFilterRoleId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Board */}
        <div className="flex-1 min-h-0">
          <PipelineBoard
            roleId={filterRoleId !== 'all' ? filterRoleId : undefined}
            roles={rolesForBoard}
          />
        </div>
      </div>
    </WiseHireShell>
  );
}
