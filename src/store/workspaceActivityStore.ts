import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceActivityType =
  | 'resume_created'
  | 'resume_deleted'
  | 'resume_duplicated'
  | 'resume_tailored'
  | 'resume_renamed'
  | 'ats_scored'
  | 'job_imported'
  | 'resumes_bulk_deleted';

export interface WorkspaceActivityEvent {
  id: string;
  type: WorkspaceActivityType;
  timestamp: string;
  resumeId?: string;
  resumeTitle?: string;
  parentResumeTitle?: string;
  newTitle?: string;
  jobTitle?: string;
  company?: string;
  score?: number;
  count?: number;
}

export interface LogWorkspaceActivityInput {
  type: WorkspaceActivityType;
  resumeId?: string;
  resumeTitle?: string;
  parentResumeTitle?: string;
  newTitle?: string;
  jobTitle?: string;
  company?: string;
  score?: number;
  count?: number;
}

const MAX_EVENTS = 48;
const DEDUPE_WINDOW_MS = 90_000;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isDuplicate(
  prev: WorkspaceActivityEvent,
  next: LogWorkspaceActivityInput,
): boolean {
  if (Date.now() - new Date(prev.timestamp).getTime() > DEDUPE_WINDOW_MS) return false;
  if (prev.type !== next.type) return false;
  if (prev.resumeId !== next.resumeId) return false;
  if (next.type === 'ats_scored') return prev.score === next.score;
  if (next.type === 'resume_renamed') return prev.newTitle === next.newTitle;
  return true;
}

interface WorkspaceActivityState {
  events: WorkspaceActivityEvent[];
  log: (input: LogWorkspaceActivityInput) => void;
  getRecent: (limit?: number) => WorkspaceActivityEvent[];
  pruneResume: (resumeId: string) => void;
}

export const useWorkspaceActivityStore = create<WorkspaceActivityState>()(
  persist(
    (set, get) => ({
      events: [],

      log: (input) => {
        const events = get().events;
        if (events.length > 0 && isDuplicate(events[0], input)) return;

        const event: WorkspaceActivityEvent = {
          id: makeId(),
          timestamp: new Date().toISOString(),
          ...input,
        };

        set({ events: [event, ...events].slice(0, MAX_EVENTS) });
      },

      getRecent: (limit = 8) => get().events.slice(0, limit),

      pruneResume: (resumeId) => {
        set({
          events: get().events.filter((e) => e.resumeId !== resumeId),
        });
      },
    }),
    { name: 'wr-workspace-activity-v1' },
  ),
);

export function logWorkspaceActivity(input: LogWorkspaceActivityInput) {
  useWorkspaceActivityStore.getState().log(input);
}
