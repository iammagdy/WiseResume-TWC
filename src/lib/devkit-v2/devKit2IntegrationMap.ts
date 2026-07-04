/**
 * devKit2IntegrationMap.ts
 *
 * Read-only reference map: for each hub, which DevKit panel and Appwrite
 * action back it. Derived from the prototype's integrationMap.ts but
 * stripped of mock payloads — used only as a static reference for the
 * Integration Map UI inside DevKit2.
 *
 * This file contains NO mock data. It does NOT make any API calls.
 * It is used purely as a human-readable cross-reference table.
 */

export type Hub2Label =
  | 'Command Home'
  | 'System Health'
  | 'Users & Accounts'
  | 'AI Operations'
  | 'Growth Analytics'
  | 'Business Ops'
  | 'Developer Ops';

export interface Integration2Mapping {
  hub: Hub2Label;
  tab?: string;
  /** ID of the corresponding existing DevKit panel */
  currentPanelId: string;
  functionId: string;
  action: string;
  migrationNote: string;
  /** Step 1 status */
  step1Status: 'live-readonly' | 'placeholder' | 'disabled-dangerous';
}

export const INTEGRATION_MAP: Integration2Mapping[] = [
  // ── Command Home ──────────────────────────────────────────────────────────
  {
    hub: 'Command Home',
    currentPanelId: 'home',
    functionId: 'admin-devkit-data',
    action: 'home-summary',
    migrationNote: 'Summarises KPIs across all microservices for the global operational dashboard.',
    step1Status: 'live-readonly',
  },

  // ── System Health ─────────────────────────────────────────────────────────
  {
    hub: 'System Health',
    tab: 'Mission Control',
    currentPanelId: 'mission',
    functionId: 'admin-devkit-data',
    action: 'mission-control',
    migrationNote: 'Reads realtime microservice health values.',
    step1Status: 'placeholder',
  },
  {
    hub: 'System Health',
    tab: 'Diagnostics',
    currentPanelId: 'diagnostics',
    functionId: 'admin-devkit-data',
    action: 'diagnostics',
    migrationNote: 'Triggers diagnostic fetches including environment and schema checks.',
    step1Status: 'placeholder',
  },
  {
    hub: 'System Health',
    tab: 'Observability',
    currentPanelId: 'observability',
    functionId: 'admin-devkit-data',
    action: 'list-ai-gateway-activity',
    migrationNote: 'Fetches granular response times and AI gateway events.',
    step1Status: 'placeholder',
  },
  {
    hub: 'System Health',
    tab: 'Growth & Traffic',
    currentPanelId: 'growth',
    functionId: 'admin-devkit-data',
    action: 'analytics',
    migrationNote: 'Reads visitor and growth data from Appwrite collections.',
    step1Status: 'placeholder',
  },

  // ── Users & Accounts ──────────────────────────────────────────────────────
  {
    hub: 'Users & Accounts',
    tab: 'Overview',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'global-stats',
    migrationNote: 'Runs read count queries on Appwrite Collections.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Users & Accounts',
    tab: 'Users Explorer',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'list-users-page',
    migrationNote: 'Cursor-paginated Appwrite Collections query handler.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Users & Accounts',
    tab: 'Signups',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'list-signups',
    migrationNote: 'Lists recent account registrations.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Users & Accounts',
    tab: 'User Detail',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'get-user-detail',
    migrationNote: 'Fetches full user profile from Appwrite.',
    step1Status: 'placeholder',
  },

  // Dangerous actions — all disabled in Step 1
  {
    hub: 'Users & Accounts',
    tab: 'Suspend / Delete',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'suspend-user',
    migrationNote: 'DANGEROUS — suspends a user account.',
    step1Status: 'disabled-dangerous',
  },
  {
    hub: 'Users & Accounts',
    tab: 'Impersonate',
    currentPanelId: 'users',
    functionId: 'admin-devkit-data',
    action: 'act-as',
    migrationNote: 'DANGEROUS — impersonates a user session.',
    step1Status: 'disabled-dangerous',
  },

  // ── AI Operations ─────────────────────────────────────────────────────────
  {
    hub: 'AI Operations',
    tab: 'AI Health',
    currentPanelId: 'ai-health',
    functionId: 'admin-devkit-data',
    action: 'list-ai-gateway-activity',
    migrationNote: 'Reads AI provider health and recent request logs.',
    step1Status: 'placeholder',
  },
  {
    hub: 'AI Operations',
    tab: 'AI Routing',
    currentPanelId: 'ai-tools-map',
    functionId: 'admin-devkit-data',
    action: 'get-ai-routing-config',
    migrationNote: 'Reads current AI tool routing configuration.',
    step1Status: 'placeholder',
  },
  {
    hub: 'AI Operations',
    tab: 'AI Radar',
    currentPanelId: 'ai-radar',
    functionId: 'admin-devkit-data',
    action: 'list-ai-gateway-activity',
    migrationNote: 'Reads AI analytics and model performance metrics.',
    step1Status: 'placeholder',
  },
  {
    hub: 'AI Operations',
    tab: 'API Keys',
    currentPanelId: 'ai-keys',
    functionId: 'admin-devkit-data',
    action: 'get-ai-keys',
    migrationNote: 'Reads masked AI provider key statuses.',
    step1Status: 'placeholder',
  },
  {
    hub: 'AI Operations',
    tab: 'Update Routing',
    currentPanelId: 'ai-tools-map',
    functionId: 'admin-devkit-data',
    action: 'update-ai-routing-config',
    migrationNote: 'DANGEROUS — modifies AI routing config.',
    step1Status: 'disabled-dangerous',
  },

  // ── Growth Analytics ──────────────────────────────────────────────────────
  {
    hub: 'Growth Analytics',
    tab: 'Visitors',
    currentPanelId: 'growth',
    functionId: 'admin-devkit-data',
    action: 'analytics',
    migrationNote: 'Reads visitor session and conversion data.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Growth Analytics',
    tab: 'Funnel',
    currentPanelId: 'growth',
    functionId: 'admin-devkit-data',
    action: 'analytics',
    migrationNote: 'Reads onboarding funnel drop-off and conversion data.',
    step1Status: 'placeholder',
  },

  // ── Business Ops ──────────────────────────────────────────────────────────
  {
    hub: 'Business Ops',
    tab: 'Email Hub',
    currentPanelId: 'email-hub',
    functionId: 'admin-devkit-data',
    action: 'list-email-events',
    migrationNote: 'Lists transactional email delivery events from Appwrite.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Business Ops',
    tab: 'Coupons',
    currentPanelId: 'coupons',
    functionId: 'admin-devkit-data',
    action: 'list-coupons',
    migrationNote: 'Lists active and expired coupon codes.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Business Ops',
    tab: 'Moderation',
    currentPanelId: 'moderation',
    functionId: 'admin-devkit-data',
    action: 'list-flagged',
    migrationNote: 'Lists flagged user content for review.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Business Ops',
    tab: 'WiseHire Queue',
    currentPanelId: 'wisehire-waitlist',
    functionId: 'admin-devkit-data',
    action: 'list-wisehire-waitlist',
    migrationNote: 'Lists WiseHire early-access applicants.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Business Ops',
    tab: 'Portfolios',
    currentPanelId: 'portfolios',
    functionId: 'admin-devkit-data',
    action: 'list-portfolio-usernames',
    migrationNote: 'Lists public portfolio username reservations.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Business Ops',
    tab: 'Audit Log',
    currentPanelId: 'audit',
    functionId: 'admin-devkit-data',
    action: 'list-audit-log',
    migrationNote: 'Lists admin action audit trail.',
    step1Status: 'placeholder',
  },

  // ── Developer Ops ─────────────────────────────────────────────────────────
  {
    hub: 'Developer Ops',
    tab: 'Appwrite Functions',
    currentPanelId: 'deploy-hubs',
    functionId: 'admin-devkit-data',
    action: 'list-deploy-hubs-status',
    migrationNote: 'Reads function deployment status (read-only).',
    step1Status: 'placeholder',
  },
  {
    hub: 'Developer Ops',
    tab: 'Database X-Ray',
    currentPanelId: 'db',
    functionId: 'admin-devkit-data',
    action: 'db-xray',
    migrationNote: 'Reads collection stats and document counts.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Developer Ops',
    tab: 'System Test Runner',
    currentPanelId: 'runner',
    functionId: 'admin-devkit-data',
    action: 'run-tests',
    migrationNote: 'Runs system health checks.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Developer Ops',
    tab: 'Feature Flags',
    currentPanelId: 'flags',
    functionId: 'admin-devkit-data',
    action: 'get-feature-flags',
    migrationNote: 'Reads current feature flag state.',
    step1Status: 'placeholder',
  },
  {
    hub: 'Developer Ops',
    tab: 'Deploy Functions',
    currentPanelId: 'deploy-hubs',
    functionId: 'admin-deploy-hubs',
    action: 'deploy',
    migrationNote: 'DANGEROUS — triggers Appwrite function deployment.',
    step1Status: 'disabled-dangerous',
  },
];

/** Return only entries for a specific hub. */
export function getMapForHub(hub: Hub2Label): Integration2Mapping[] {
  return INTEGRATION_MAP.filter(m => m.hub === hub);
}

/** Return all live-readonly entries (wired in Step 1). */
export function getLiveEntries(): Integration2Mapping[] {
  return INTEGRATION_MAP.filter(m => m.step1Status === 'live-readonly');
}

/** Return all dangerous entries (disabled in Step 1). */
export function getDangerousEntries(): Integration2Mapping[] {
  return INTEGRATION_MAP.filter(m => m.step1Status === 'disabled-dangerous');
}
