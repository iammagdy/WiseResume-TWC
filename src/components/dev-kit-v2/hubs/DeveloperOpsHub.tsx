/**
 * DeveloperOpsHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the developer operations panels that will be wired in Step 2.
 * Deployment actions are explicitly listed as disabled with safety notices.
 * No API calls are made. No mock data is shown.
 */

import { Wrench, Database, Play, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'deploy-hubs',
    label: 'Appwrite Functions (Status)',
    icon: Wrench,
    description: 'Read-only view of Appwrite function deployment status and health.',
    action: 'list-deploy-hubs-status',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DeployHubsPanel (read-only parts)',
  },
  {
    id: 'db',
    label: 'Database X-Ray',
    icon: Database,
    description: 'Collection document counts, schema validation, and index health.',
    action: 'db-xray',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DatabaseXRay',
  },
  {
    id: 'runner',
    label: 'System Test Runner',
    icon: Play,
    description: 'Run system health checks to verify all Appwrite endpoints are reachable.',
    action: 'run-tests',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DevKitRunner',
  },
  {
    id: 'flags',
    label: 'Feature Flags',
    icon: Flag,
    description: 'Read-only view of platform feature flag states.',
    action: 'get-feature-flags',
    functionId: 'admin-devkit-data',
    legacyPanel: 'FeatureFlagsPanel',
  },
];

const DISABLED_ACTIONS = [
  {
    label: 'Deploy Appwrite Function',
    action: 'deploy',
    note: 'Triggers live production deployment. Explicitly excluded from Step 1.',
  },
  {
    label: 'Rollback Function',
    action: 'rollback-deploy',
    note: 'Requires explicit owner approval before enabling.',
  },
  {
    label: 'Toggle Feature Flag',
    action: 'set-feature-flag',
    note: 'Write action — disabled in preview.',
  },
];

export function DeveloperOpsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Developer Ops</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Appwrite function deployment state, database X-Ray, and system tests.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="font-semibold text-xs text-amber-400 mb-1">DevKit2 Step 1 — Placeholder</p>
        <p className="text-xs text-muted-foreground">
          Developer Ops panels will be wired to live read-only data in Step 2.
          <strong className="text-foreground"> Deployment actions will never be enabled in DevKit2 without explicit owner approval.</strong>
        </p>
      </div>

      {/* Safety notice */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <p className="font-semibold text-xs text-red-400 mb-1">⚠ Deployment Safety Notice</p>
        <p className="text-xs text-muted-foreground">
          No deploy, rollback, or environment-write actions will be added to DevKit2 Step 1.
          All deployments must continue to go through{' '}
          <code className="text-foreground">/devkit → Appwrite Functions</code> with its existing
          safeguards and confirmation dialogs.
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
          Deployment / Write Actions — Disabled in DevKit2 Preview
        </h3>
        <div className="space-y-2">
          {DISABLED_ACTIONS.map((a) => (
            <div
              key={a.action}
              className="rounded-lg border border-border bg-muted/30 px-4 py-3 opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{a.label}</span>
                <span className="shrink-0 rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-400">
                  Disabled in DevKit2 preview
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/60">{a.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
