/**
 * GrowthAnalyticsHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the analytics panels that will be wired in Step 2.
 * No API calls are made. No mock data is shown.
 */

import { TrendingUp, Users, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'growth',
    label: 'Growth & Traffic',
    icon: TrendingUp,
    description: 'Visitor sessions, referrer breakdown, and page-level traffic statistics.',
    action: 'analytics',
    functionId: 'admin-devkit-data',
    legacyPanel: 'GrowthTrafficPanel / AnalyticsPanel',
  },
  {
    id: 'visitors',
    label: 'Visitors',
    icon: Users,
    description: 'Individual visitor event log with country, device, and conversion status.',
    action: 'analytics',
    functionId: 'admin-devkit-data',
    legacyPanel: 'VisitorsPanel',
  },
  {
    id: 'funnel',
    label: 'Onboarding Funnel',
    icon: BarChart2,
    description: 'Step-by-step funnel drop-off analysis from landing to pro checkout.',
    action: 'analytics',
    functionId: 'admin-devkit-data',
    legacyPanel: 'OnboardingFunnelPanel',
  },
];

export function GrowthAnalyticsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Growth Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Onboarding funnel, visitor data, and conversion metrics.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="font-semibold text-xs text-amber-400 mb-1">DevKit2 Step 1 — Placeholder</p>
        <p className="text-xs text-muted-foreground">
          Growth analytics will be wired to live read-only data in Step 2.
          Use <code className="text-foreground">/devkit → Growth & Traffic</code> for current live data.
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
          /devkit → Growth & Traffic
        </a>{' '}
        for live data.
      </p>
    </div>
  );
}
