/**
 * BusinessOpsHub.tsx
 *
 * Step 1: Structural placeholder.
 * Documents the business operations panels that will be wired in Step 2.
 * No API calls are made. No mock data is shown.
 */

import { Mail, Ticket, Shield, Briefcase, Link2, History, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLANNED_PANELS = [
  {
    id: 'email-hub',
    label: 'Email Hub',
    icon: Mail,
    description: 'Transactional email delivery events, templates, and status tracking.',
    action: 'list-email-events',
    functionId: 'admin-devkit-data',
    legacyPanel: 'EmailHubPanel / EmailManagementPanel',
  },
  {
    id: 'coupons',
    label: 'Coupons',
    icon: Ticket,
    description: 'Active, expired, and paused coupon codes with usage statistics.',
    action: 'list-coupons',
    functionId: 'admin-devkit-data',
    legacyPanel: 'CouponsPanel',
  },
  {
    id: 'moderation',
    label: 'Moderation',
    icon: Shield,
    description: 'Flagged user content queue, scraping pattern detection, and review tools.',
    action: 'list-flagged',
    functionId: 'admin-devkit-data',
    legacyPanel: 'ModerationPanel',
  },
  {
    id: 'wisehire-waitlist',
    label: 'WiseHire Queue',
    icon: Briefcase,
    description: 'WiseHire early-access applicants pending approval or dismissal.',
    action: 'list-wisehire-waitlist',
    functionId: 'admin-devkit-data',
    legacyPanel: 'WiseHireWaitlistPanel',
  },
  {
    id: 'portfolios',
    label: 'Portfolio Usernames',
    icon: Link2,
    description: 'Public portfolio username reservations, view counts, and lock status.',
    action: 'list-portfolio-usernames',
    functionId: 'admin-devkit-data',
    legacyPanel: 'PortfolioUsernamesPanel',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: History,
    description: 'Full admin action audit trail with filtering by category and actor.',
    action: 'list-audit-log',
    functionId: 'admin-devkit-data',
    legacyPanel: 'AuditLogPanel',
  },
  {
    id: 'flags',
    label: 'Feature Flags',
    icon: Flag,
    description: 'Platform feature flags controlling access to experimental features.',
    action: 'get-feature-flags',
    functionId: 'admin-devkit-data',
    legacyPanel: 'FeatureFlagsPanel',
  },
];

const DISABLED_ACTIONS = [
  { label: 'Approve / Dismiss WiseHire Applicant', action: 'approve-wisehire' },
  { label: 'Create / Pause / Delete Coupon', action: 'create-coupon' },
  { label: 'Send Email (Password Reset, Verification)', action: 'send-email' },
  { label: 'Toggle Feature Flag', action: 'set-feature-flag' },
];

export function BusinessOpsHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Business Ops</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Email hub, coupons, moderation queues, waitlists, and audit log.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <p className="font-semibold text-xs text-amber-400 mb-1">DevKit2 Step 1 — Placeholder</p>
        <p className="text-xs text-muted-foreground">
          Business Ops panels will be wired to live read-only data in Step 2.
          All write actions remain disabled in this preview.
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
          Write Actions — Disabled in DevKit2 Preview
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
