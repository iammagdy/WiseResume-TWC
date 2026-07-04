import {
  Activity,
  Briefcase,
  Cpu,
  Home,
  Terminal,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ElementType } from 'react';

// ─── Hub IDs ─────────────────────────────────────────────────────────────────

export type Hub2Id =
  | 'home'
  | 'health'
  | 'users'
  | 'ai'
  | 'growth'
  | 'business'
  | 'devops';

// ─── Hub definitions ─────────────────────────────────────────────────────────

export interface Hub2Def {
  id: Hub2Id;
  label: string;
  shortLabel: string;
  description: string;
  icon: ElementType;
  /** Existing DevKit panel IDs that map into this hub (for reference / integration map). */
  legacyPanelIds: string[];
}

export const HUB2_DEFS: Hub2Def[] = [
  {
    id: 'home',
    label: 'Command Home',
    shortLabel: 'Home',
    description: 'Active operator summary across all hubs',
    icon: Home,
    legacyPanelIds: ['home', 'mission', 'overview'],
  },
  {
    id: 'health',
    label: 'System Health',
    shortLabel: 'Health',
    description: 'Realtime telemetry, diagnostics, and cluster status',
    icon: Activity,
    legacyPanelIds: ['diagnostics', 'mission', 'observability', 'growth', 'runner'],
  },
  {
    id: 'users',
    label: 'Users & Accounts',
    shortLabel: 'Users',
    description: 'Account explorer, subscription analytics, and signups',
    icon: Users,
    legacyPanelIds: ['users', 'db', 'moderation', 'audit'],
  },
  {
    id: 'ai',
    label: 'AI Operations',
    shortLabel: 'AI',
    description: 'LLM adapter routes, performance diagnostics, and key management',
    icon: Cpu,
    legacyPanelIds: ['ai-health', 'ai-tools-map', 'ai-radar', 'ai-keys'],
  },
  {
    id: 'growth',
    label: 'Growth Analytics',
    shortLabel: 'Growth',
    description: 'Onboarding funnel, visitor data, and conversion metrics',
    icon: TrendingUp,
    legacyPanelIds: ['growth', 'overview'],
  },
  {
    id: 'business',
    label: 'Business Ops',
    shortLabel: 'Business',
    description: 'Email hub, coupons, moderation queues, and waitlists',
    icon: Briefcase,
    legacyPanelIds: ['email-hub', 'coupons', 'moderation', 'wisehire-waitlist', 'portfolios', 'audit', 'flags'],
  },
  {
    id: 'devops',
    label: 'Developer Ops',
    shortLabel: 'Dev',
    description: 'Appwrite function deployment, database X-Ray, and system tests',
    icon: Terminal,
    legacyPanelIds: ['deploy-hubs', 'db', 'runner', 'flags'],
  },
];

export function getHub2Def(id: Hub2Id): Hub2Def {
  return HUB2_DEFS.find(h => h.id === id) ?? HUB2_DEFS[0];
}
