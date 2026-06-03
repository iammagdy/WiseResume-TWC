import {
  Activity,
  BarChart2,
  Briefcase,
  BrainCircuit,
  Database,
  Flag,
  History,
  Home,
  KeyRound,
  LayoutDashboard,
  Link2,
  Mail,
  Play,
  ServerCog,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import type { ElementType } from 'react';

export type PanelStatus = 'Live' | 'Needs Appwrite Function' | 'Needs Schema' | 'Planned';

export interface PanelDef {
  id: string;
  title: string;
  icon: ElementType;
  status: PanelStatus;
  blockers?: string[];
}

export const PANEL_GROUPS: { label: string; panels: PanelDef[] }[] = [
  { label: 'System Health', panels: [
    { id: 'home',              title: 'Home',                icon: Home,           status: 'Live' },
    { id: 'mission',           title: 'Mission Control',     icon: Activity,       status: 'Live' },
    { id: 'diagnostics',       title: 'Diagnostics',         icon: ServerCog,      status: 'Live' },
    { id: 'observability',     title: 'Observability',       icon: BarChart2,      status: 'Live' },
    { id: 'growth',            title: 'Growth & Traffic',    icon: TrendingUp,     status: 'Live' },
  ]},
  { label: 'Command Center', panels: [
    { id: 'overview',          title: 'Data Integrity',      icon: LayoutDashboard, status: 'Live' },
    { id: 'users',             title: 'Users',               icon: Users,            status: 'Live' },
    { id: 'db',                title: 'Database X-Ray',      icon: Database,         status: 'Live' },
    { id: 'flags',             title: 'Feature Flags',       icon: Flag,             status: 'Live' },
  ]},
  { label: 'AI Control Center', panels: [
    { id: 'ai-health',         title: 'AI Health',           icon: BrainCircuit,     status: 'Live' },
    { id: 'ai-tools-map',      title: 'AI Tools Map',        icon: Wrench,           status: 'Live' },
    { id: 'ai-keys',           title: 'API Keys',            icon: KeyRound,         status: 'Live' },
  ]},
  { label: 'Support & Business Ops', panels: [
    { id: 'moderation',        title: 'Moderation',          icon: ShieldCheck,      status: 'Live' },
    { id: 'email-hub',         title: 'Email',               icon: Mail,             status: 'Live' },
    { id: 'coupons',           title: 'Coupons',             icon: Ticket,           status: 'Live' },
    { id: 'portfolios',        title: 'Portfolios',          icon: Link2,            status: 'Live' },
    { id: 'wisehire-waitlist', title: 'WiseHire Queue',      icon: Briefcase,        status: 'Live' },
    { id: 'audit',             title: 'Audit Log',           icon: History,          status: 'Live' },
  ]},
  { label: 'Developer Tools', panels: [
    { id: 'runner',            title: 'System Test Runner',  icon: Play,             status: 'Live' },
    { id: 'deploy-hubs',       title: 'Appwrite Functions',  icon: Wrench,           status: 'Live' },
  ]},
];

export const DEVTOOLS_PANEL_ALIASES: Record<string, string> = {
  deployment: 'diagnostics',
  openrouter: 'ai-health',
  'ai-keys': 'ai-keys',
  ai: 'ai-health',
  'ai-routing': 'ai-tools-map',
  email: 'email-hub',
  testmail: 'email-hub',
  'email-automations': 'email-hub',
  visitors: 'growth',
  analytics: 'growth',
  'onboarding-funnel': 'growth',
  settings: 'flags',
  overview: 'overview',
  live: 'growth',
};

export function allPanels() {
  return PANEL_GROUPS.flatMap(group => group.panels);
}

export function statusShort(status: PanelStatus) {
  return status === 'Needs Appwrite Function'
    ? 'Function'
    : status === 'Needs Schema'
      ? 'Schema'
      : status;
}

export function groupForPanel(panelId: string): string {
  return PANEL_GROUPS.find(group => group.panels.some(panel => panel.id === panelId))?.label ?? 'DevKit';
}
