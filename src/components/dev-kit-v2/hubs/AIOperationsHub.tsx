/**
 * AIOperationsHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the panels and actions that will be wired in Step 2.
 * Routing mutations and key updates are listed as disabled.
 * No API calls are made. No mock data is shown.
 */

import { BrainCircuit, Radar, Wrench, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'ai-health',
    label: 'AI Health',
    icon: BrainCircuit,
    description: 'AI provider health, recent gateway activity, and success/failure rates.',
    action: 'list-ai-gateway-activity',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AICommandCenterPanel',
  },
  {
    id: 'ai-tools-map',
    label: 'AI Routing',
    icon: Wrench,
    description: 'Current AI tool-to-provider routing configuration (read-only view).',
    action: 'get-ai-routing-config',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AIRoutingSwitcher',
  },
  {
    id: 'ai-radar',
    label: 'AI Radar',
    icon: Radar,
    description: 'Model performance analytics, latency distribution, and cost tracking.',
    action: 'list-ai-gateway-activity',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AIRadarPanel',
  },
  {
    id: 'ai-keys',
    label: 'API Keys',
    icon: KeyRound,
    description: 'Masked AI provider key status and configuration health.',
    action: 'get-ai-keys',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AIKeysPanel',
  },
];

const DISABLED_ACTIONS = [
  { label: 'Update AI Routing Config', action: 'update-ai-routing-config' },
  { label: 'Set AI Provider Keys', action: 'set-ai-keys' },
  { label: 'Toggle Fallback Override', action: 'set-fallback-override' },
];

export function AIOperationsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Operations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          LLM adapter routes, performance diagnostics, and key management.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="font-semibold text-xs text-amber-400 mb-1">DevKit2 Step 1 — Placeholder</p>
        <p className="text-xs text-muted-foreground">
          This hub will be wired to live read-only data in Step 2.
          Routing mutations and key updates remain disabled in this preview.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLANNED_PANELS.map((panel) => {
          const Icon = panel.icon;
          return (
            <Card key={panel.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={15} className="text-muted-foreground" />
                  {panel.label}
                  <span className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    Step 2
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{panel.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground/70">
                  <span className="rounded bg-muted px-1.5 py-0.5">{panel.functionId}</span>
                  <span>→</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{panel.action}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  Existing panel: <code className="text-foreground/60">{panel.legacyPanel}</code>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mutation Actions — Disabled in DevKit2 Preview
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DISABLED_ACTIONS.map((a) => (
            <div
              key={a.action}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5 opacity-60"
            >
              <span className="text-sm text-muted-foreground">{a.label}</span>
              <span className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-400">
                Disabled in DevKit2 preview
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
