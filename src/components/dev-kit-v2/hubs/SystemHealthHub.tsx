/**
 * SystemHealthHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the panels and actions that will be wired in Step 2.
 * No API calls are made. No mock data is shown.
 */

import { Activity, BarChart2, ServerCog, TrendingUp, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'mission',
    label: 'Mission Control',
    icon: Activity,
    description: 'Realtime microservice health status across all Appwrite functions and providers.',
    action: 'mission-control',
    functionId: 'admin-devkit-data',
    legacyPanel: 'MissionControlPanel',
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    icon: ServerCog,
    description: 'Environment readiness, schema checks, and deployment state.',
    action: 'diagnostics',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DiagnosticsPanel',
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: BarChart2,
    description: 'AI gateway activity logs, response times, and provider health.',
    action: 'list-ai-gateway-activity',
    functionId: 'admin-devkit-data',
    legacyPanel: 'ObservabilityPanel',
  },
  {
    id: 'growth',
    label: 'Growth & Traffic',
    icon: TrendingUp,
    description: 'Visitor sessions, referrer breakdown, and conversion funnel summary.',
    action: 'analytics',
    functionId: 'admin-devkit-data',
    legacyPanel: 'GrowthTrafficPanel',
  },
  {
    id: 'runner',
    label: 'System Test Runner',
    icon: Play,
    description: 'Run system health checks and verify all Appwrite endpoints are reachable.',
    action: 'run-tests',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DevKitRunner',
  },
];

export function SystemHealthHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">System Health</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Telemetry, diagnostics, and cluster status hub.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        <p className="font-semibold text-xs mb-1">DevKit2 Step 1 — Placeholder</p>
        <p className="text-xs text-muted-foreground">
          This hub will be wired to live read-only data in Step 2. The panels below
          document the planned integration. The existing{' '}
          <code className="text-foreground">/devkit</code> panels remain unchanged and
          fully functional.
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

      <p className="text-xs text-center text-muted-foreground/50">
        Not wired in DevKit2 Step 1 — use{' '}
        <a href="/devkit" className="underline hover:text-foreground transition-colors">
          /devkit → System Health panels
        </a>{' '}
        for live data.
      </p>
    </div>
  );
}
