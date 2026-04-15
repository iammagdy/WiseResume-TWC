import { useState } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { PipelineBoard } from '@/components/wisehire/pipeline/PipelineBoard';
import { BiasToggle } from '@/components/wisehire/BiasToggle';
import { useBiasMode } from '@/hooks/wisehire/useBiasMode';
import { useJDs } from '@/hooks/wisehire/useJDs';
import { useClients } from '@/hooks/wisehire/useClients';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Layers, Building2 } from 'lucide-react';

export default function PipelinePage() {
  const { data: roles = [], isLoading: rolesLoading } = useJDs();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const [filterRoleId, setFilterRoleId] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const { biasMode, toggleBiasMode } = useBiasMode();

  const rolesForBoard = roles.map((r) => ({ id: r.id, title: r.title }));
  const showClientFilter = !clientsLoading && clients.length > 0;
  const showRoleFilter = !rolesLoading && roles.length > 0;

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

          <div className="flex items-center gap-3 flex-wrap">
            {/* Client filter */}
            {showClientFilter && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <Select value={filterClientId} onValueChange={setFilterClientId}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role filter */}
            {showRoleFilter && (
              <div className="flex items-center gap-2">
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

            <BiasToggle biasMode={biasMode} onToggle={toggleBiasMode} />
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 min-h-0">
          <PipelineBoard
            roleId={filterRoleId !== 'all' ? filterRoleId : undefined}
            clientId={filterClientId !== 'all' ? filterClientId : undefined}
            roles={rolesForBoard}
            biasMode={biasMode}
          />
        </div>
      </div>
    </WiseHireShell>
  );
}
