/**
 * UsersAccountsHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the panels and actions that will be wired in Step 2.
 * All user mutation actions are listed as disabled.
 * No API calls are made. No mock data is shown.
 */

import { Users, Database, Shield, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'users',
    label: 'Users Explorer',
    icon: Users,
    description: 'Paginated user account list with filters by plan, status, and country.',
    action: 'list-users-page',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AdminUsersPanel',
    dangerous: false,
  },
  {
    id: 'global-stats',
    label: 'Account Overview',
    icon: Users,
    description: 'Aggregated count queries across Appwrite Collections for user stats.',
    action: 'global-stats',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AdminUsersPanel',
    dangerous: false,
  },
  {
    id: 'db',
    label: 'Database X-Ray',
    icon: Database,
    description: 'Collection stats, document counts, and schema validation.',
    action: 'db-xray',
    functionId: 'admin-devkit-data',
    legacyPanel: 'DatabaseXRay',
    dangerous: false,
  },
  {
    id: 'moderation',
    label: 'Moderation',
    icon: Shield,
    description: 'Flagged user content queue for review.',
    action: 'list-flagged',
    functionId: 'admin-devkit-data',
    legacyPanel: 'ModerationPanel',
    dangerous: false,
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: History,
    description: 'Admin action audit trail with filtering.',
    action: 'list-audit-log',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AuditLogPanel',
    dangerous: false,
  },
];

const DISABLED_ACTIONS = [
  { label: 'Suspend User', action: 'suspend-user' },
  { label: 'Delete User', action: 'delete-user' },
  { label: 'Impersonate User (Act As)', action: 'act-as' },
  { label: 'Send Password Reset', action: 'send-password-reset' },
  { label: 'Set Plan / Grant Trial', action: 'set-plan' },
  { label: 'Modify Credits', action: 'set-credits' },
];

export function UsersAccountsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Users & Accounts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Account explorer, subscription analytics, and user management.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        <p className="font-semibold text-xs mb-1">DevKit2 Step 1 — Read-only shell placeholder</p>
        <p className="text-xs text-muted-foreground">
          This hub will be wired to live read-only data in Step 2.
          All user mutation actions are disabled in this preview.
          Use <code className="text-foreground">/devkit → Users</code> for live access.
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disabled dangerous actions */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dangerous Actions — Disabled in DevKit2 Preview
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
