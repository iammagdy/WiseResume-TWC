import { activityTracker } from '@/lib/activityTracker';
import { detectScreen, categorizeError } from '@/lib/bugReport';
import { getBuildVersion } from '@/lib/appVersion';
import { getCrashReporterContext } from '@/lib/crashReportContext';

export interface CrashReportInput {
  error: Error;
  componentStack?: string | null;
  route?: string;
  userNote?: string;
  source: 'error_boundary_auto' | 'error_boundary_manual' | 'bug_dialog';
  reportType: 'auto-crash-report' | 'bug';
  sentryEventId?: string;
  /** Extra fields from manual bug dialog */
  screenLabel?: string;
  errorCategory?: string;
  action?: string | null;
  recentErrors?: Array<{ message: string; stack?: string; timestamp: number }> | null;
}

export interface CrashReportMetadata {
  report_type: string;
  error_name: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  route: string;
  screen: string;
  pathname: string;
  search: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  plan_tier: string | null;
  is_premium: boolean;
  priority: 'high' | 'normal';
  active_feature: string | null;
  action: string | null;
  error_category: string | null;
  user_agent: string;
  app_version: string;
  timestamp: string;
  sentry_event_id: string | null;
  auto_report: boolean;
  source: string;
  user_note: string | null;
  recent_errors: CrashReportInput['recentErrors'];
  ai_fix_prompt: string;
}

function priorityLabel(isPremium: boolean): 'high' | 'normal' {
  return isPremium ? 'high' : 'normal';
}

export function buildCrashReportMetadata(input: CrashReportInput): CrashReportMetadata {
  const ctx = getCrashReporterContext();
  const route = input.route ?? `${window.location.pathname}${window.location.search}`;
  const pathname = route.split('?')[0] ?? route;
  const search = route.includes('?') ? route.slice(route.indexOf('?')) : '';
  const screen = input.screenLabel ?? detectScreen(pathname);
  const snapshot = activityTracker.getSnapshot();
  const activeFeature = snapshot.activeFeature ?? input.action ?? null;
  const category = input.errorCategory ?? categorizeError(input.error.message, activeFeature).category;
  const timestamp = new Date().toISOString();
  const isPremium = ctx.isPremium;
  const priority = priorityLabel(isPremium);

  const meta: Omit<CrashReportMetadata, 'ai_fix_prompt'> = {
    report_type: input.reportType,
    error_name: input.error.name,
    error_message: input.error.message,
    error_stack: input.error.stack?.slice(0, 8000) ?? null,
    component_stack: input.componentStack?.slice(0, 8000) ?? null,
    route,
    screen,
    pathname,
    search,
    user_id: ctx.userId,
    user_email: ctx.userEmail,
    user_name: ctx.userName,
    plan_tier: ctx.planTier,
    is_premium: isPremium,
    priority,
    active_feature: activeFeature,
    action: input.action ?? null,
    error_category: category,
    user_agent: navigator.userAgent,
    app_version: getBuildVersion(),
    timestamp,
    sentry_event_id: input.sentryEventId ?? null,
    auto_report: input.source === 'error_boundary_auto',
    source: input.source,
    user_note: input.userNote?.trim() || null,
    recent_errors: input.recentErrors ?? snapshot.recentErrors,
  };

  const ai_fix_prompt = buildAiFixPrompt(meta);

  return { ...meta, ai_fix_prompt };
}

export function buildAiFixPrompt(meta: Omit<CrashReportMetadata, 'ai_fix_prompt'>): string {
  const lines: string[] = [
    '# WiseResume — Crash Report (AI Fix Prompt)',
    '',
    'Use this report to reproduce and fix the exact production crash. Do not guess — follow the route, user context, and stack trace below.',
    '',
    '## Priority',
    meta.priority === 'high'
      ? '**HIGH — Premium subscriber.** Prioritize investigation and fix.'
      : '**NORMAL — Free tier user.**',
    '',
    '## User',
    `- User ID: ${meta.user_id ?? 'anonymous (not signed in)'}`,
    `- Email: ${meta.user_email ?? 'unknown'}`,
    meta.user_name ? `- Name: ${meta.user_name}` : null,
    `- Plan: ${meta.plan_tier ?? 'unknown'}${meta.is_premium ? ' (Premium)' : ''}`,
    '',
    '## When & where',
    `- Timestamp (UTC): ${meta.timestamp}`,
    `- Route: \`${meta.route}\``,
    `- Screen: ${meta.screen}`,
    meta.active_feature ? `- Active feature: ${meta.active_feature}` : null,
    meta.action ? `- User action context: ${meta.action}` : null,
    meta.error_category ? `- Error category: ${meta.error_category}` : null,
    '',
    '## Error',
    `- Type: ${meta.error_name}`,
    `- Message: ${meta.error_message}`,
    '',
  ].filter((line): line is string => line !== null);

  if (meta.user_note) {
    lines.push('## User note', meta.user_note, '');
  }

  if (meta.recent_errors?.length) {
    lines.push('## Recent errors (last 60s)');
    meta.recent_errors.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.message}`);
      if (e.stack) lines.push('```', e.stack.slice(0, 1500), '```');
    });
    lines.push('');
  }

  if (meta.error_stack) {
    lines.push('## Stack trace', '```', meta.error_stack, '```', '');
  }

  if (meta.component_stack) {
    lines.push('## React component stack', '```', meta.component_stack.trim(), '```', '');
  }

  lines.push(
    '## Environment',
    `- App version: ${meta.app_version}`,
    `- User agent: ${meta.user_agent}`,
    meta.sentry_event_id ? `- Sentry event ID: ${meta.sentry_event_id}` : null,
    `- Report source: ${meta.source}`,
    '',
    '## Task for coding agent',
    `Fix this crash in the WiseResume codebase (React 18 + Vite + Appwrite + TanStack Query).`,
    `The user was on \`${meta.route}\` (${meta.screen})${meta.active_feature ? ` using **${meta.active_feature}**` : ''} when \`${meta.error_name}: ${meta.error_message}\` occurred.`,
    'Locate the root cause from the stack trace, apply a minimal fix, and verify on the same route.',
  );

  return lines.filter((line): line is string => line !== null).join('\n');
}

export function buildCrashReportSubject(meta: CrashReportMetadata): string {
  const priorityTag = meta.priority === 'high' ? '[Premium]' : '[Free]';
  const userTag = meta.user_email ?? meta.user_id ?? 'anonymous';
  return `${priorityTag} Crash on ${meta.screen}: ${meta.error_message.slice(0, 60)} — ${userTag}`;
}

/** JSON blob stored in bug_reports.additional_context for admin parsing. */
export function serializeCrashContextForDb(meta: CrashReportMetadata): string {
  return JSON.stringify({
    user_id: meta.user_id,
    user_name: meta.user_name,
    plan_tier: meta.plan_tier,
    is_premium: meta.is_premium,
    priority: meta.priority,
    screen: meta.screen,
    active_feature: meta.active_feature,
    action: meta.action,
    error_category: meta.error_category,
    error_name: meta.error_name,
    sentry_event_id: meta.sentry_event_id,
    source: meta.source,
    auto_report: meta.auto_report,
    ai_fix_prompt: meta.ai_fix_prompt,
  });
}

export function parseCrashContextFromDb(
  raw: string | null | undefined,
  componentStack?: string | null,
): Record<string, unknown> | null {
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
      // fall through to component_stack embedded context
    }
  }
  const stack = componentStack ?? '';
  const marker = '\n--- context ---\n';
  const idx = stack.indexOf(marker);
  if (idx === -1) return null;
  try {
    const parsed = JSON.parse(stack.slice(idx + marker.length).trim()) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
