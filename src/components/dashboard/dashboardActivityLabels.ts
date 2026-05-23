import type { WorkspaceActivityEvent } from '@/store/workspaceActivityStore';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';

export interface ActivityFeedItem {
  id: string;
  label: string;
  detail?: string;
  time: string;
  sortKey: number;
  resumeId?: string;
}

export function formatWorkspaceActivity(event: WorkspaceActivityEvent): Pick<ActivityFeedItem, 'label' | 'detail'> {
  const title = event.resumeTitle?.trim();
  const quoted = title ? `“${title}”` : 'a resume';

  switch (event.type) {
    case 'resume_created':
      return { label: 'Resume created', detail: title ?? undefined };
    case 'resume_deleted':
      return { label: 'Resume deleted', detail: title ?? undefined };
    case 'resume_duplicated':
      return { label: 'Resume duplicated', detail: title ?? undefined };
    case 'resume_tailored':
      return {
        label: 'Tailored copy saved',
        detail: title
          ? event.parentResumeTitle
            ? `${title} · from ${event.parentResumeTitle}`
            : title
          : event.parentResumeTitle,
      };
    case 'resume_renamed':
      return {
        label: 'Resume renamed',
        detail: event.newTitle ? `Now ${event.newTitle}` : title,
      };
    case 'ats_scored':
      return {
        label: event.score != null ? `ATS scored ${event.score}%` : 'ATS scan completed',
        detail: title,
      };
    case 'job_imported':
      return {
        label: 'Job posting imported',
        detail: [event.jobTitle, event.company].filter(Boolean).join(' · ') || undefined,
      };
    case 'resumes_bulk_deleted':
      return {
        label: `Deleted ${event.count ?? 0} resume${event.count === 1 ? '' : 's'}`,
        detail: event.count && event.count > 1 ? 'Bulk selection' : title,
      };
    default:
      return { label: 'Workspace update', detail: quoted };
  }
}

export function buildActivityFeedFromLog(
  events: WorkspaceActivityEvent[],
  limit = 6,
): ActivityFeedItem[] {
  return events.slice(0, limit).map((event) => {
    const { label, detail } = formatWorkspaceActivity(event);
    return {
      id: event.id,
      label,
      detail,
      time: safeFormatDistanceToNow(event.timestamp, { addSuffix: true }),
      sortKey: new Date(event.timestamp).getTime(),
      resumeId: event.resumeId,
    };
  });
}
