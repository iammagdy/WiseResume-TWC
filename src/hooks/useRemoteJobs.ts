import { useState, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { databases, functions, DATABASE_ID, account } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { Query, ID, Permission, Role } from 'appwrite';
import {
  type NormalizedRemoteJob,
  type JobSource,
  type RoleGroup,
  type UserJobActionStatus,
  parseRemotiveJob,
  parseJobicyJob,
} from '@/lib/remoteJobsFeed';

export type JobFilterOptions = {
  source?: JobSource | 'all';
  roleGroup?: RoleGroup | 'all';
  roleGroups?: RoleGroup[]; // Supports array of role groups for consolidated display groups
  category?: string | 'all';
  query?: string;
  page?: number;
  limit?: number;
  region_fit?: string | 'all';
  seniority?: string | 'all';
  has_salary?: boolean;
  min_salary?: number;
  salary_period?: string | 'all';
  show_older?: boolean;
};

interface JobsFetchResult {
  jobs: NormalizedRemoteJob[];
  total: number;
  isSynced: boolean;
  lastSyncedAt: string | null;
  serverActions: Map<string, { status: UserJobActionStatus; applied_at?: string; saved_at?: string }>;
}

export function useRemoteJobs(options: JobFilterOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [optimisticActions, setOptimisticActions] = useState<
    Map<string, { status: UserJobActionStatus; applied_at?: string; saved_at?: string }>
  >(new Map());

  const {
    source = 'all',
    roleGroup = 'all',
    roleGroups,
    category = 'all',
    query = '',
    page = 1,
    limit = 50,
    region_fit = 'all',
    seniority = 'all',
    has_salary = false,
    min_salary,
    salary_period = 'all',
    show_older = false,
  } = options;

  const roleGroupKey = roleGroups ? roleGroups.join(',') : roleGroup;

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<JobsFetchResult>({
    queryKey: [
      'remote-jobs',
      user?.id,
      isAuthenticated,
      source,
      roleGroupKey,
      category,
      query,
      page,
      limit,
      region_fit,
      seniority,
      has_salary,
      min_salary,
      salary_period,
      show_older,
    ],
    queryFn: async (): Promise<JobsFetchResult> => {
      // 1. Attempt serverless function get-remote-jobs if available
      try {
        const jwtRes = isAuthenticated ? await account.createJWT().catch(() => null) : null;
        const jwt = jwtRes?.jwt;

        const exec = await functions.createExecution(
          'get-remote-jobs',
          JSON.stringify({
            source: source !== 'all' ? source : undefined,
            role_group: roleGroup !== 'all' ? roleGroup : undefined,
            role_groups: roleGroups && roleGroups.length > 0 ? roleGroups : undefined,
            category: category !== 'all' ? category : undefined,
            query: query.trim() || undefined,
            page,
            limit,
            region_fit: region_fit !== 'all' ? region_fit : undefined,
            seniority_level: seniority !== 'all' ? seniority : undefined,
            has_salary: has_salary ? true : undefined,
            min_salary: min_salary || undefined,
            salary_period: salary_period !== 'all' ? salary_period : undefined,
            show_older: show_older ? true : undefined,
            __headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          }),
          false,
        );

        if (exec.status === 'completed' && exec.responseBody) {
          const res = JSON.parse(exec.responseBody);
          if (res.ok && Array.isArray(res.jobs)) {
            const actionMap = new Map<string, { status: UserJobActionStatus; applied_at?: string; saved_at?: string }>();
            for (const item of res.jobs) {
              if (item.user_action) {
                actionMap.set(item.$id || item.dedupe_key, item.user_action);
              }
            }
            return {
              jobs: res.jobs,
              total: res.total || res.jobs.length,
              isSynced: res.jobs.length > 0,
              lastSyncedAt: res.last_synced_at || null,
              serverActions: actionMap,
            };
          }
        }
      } catch {
        // Fallback to direct Appwrite collection query
      }

      // 2. Direct Appwrite collection read fallback
      try {
        const queries = [
          Query.orderDesc('published_at'),
          Query.limit(limit),
          Query.offset((page - 1) * limit),
        ];

        if (!show_older) {
          const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
          queries.push(Query.greaterThanEqual('published_at', threeDaysAgoIso));
        } else {
          const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          queries.push(Query.greaterThanEqual('published_at', thirtyDaysAgoIso));
        }

        if (source !== 'all') {
          queries.push(Query.equal('source', source));
        }
        if (roleGroups && roleGroups.length > 0) {
          queries.push(Query.equal('role_group', roleGroups));
        } else if (roleGroup !== 'all') {
          queries.push(Query.equal('role_group', roleGroup));
        }
        if (category !== 'all') {
          queries.push(Query.equal('category', category));
        }
        if (region_fit !== 'all') {
          queries.push(Query.equal('region_fit', region_fit));
        }
        if (seniority !== 'all') {
          queries.push(Query.equal('seniority_level', seniority));
        }
        if (has_salary) {
          queries.push(Query.equal('salary_quality', ['trusted', 'estimated']));
        }
        if (min_salary) {
          queries.push(Query.greaterThanEqual('salary_amount_min', min_salary));
        }
        if (salary_period !== 'all') {
          queries.push(Query.equal('salary_period', salary_period));
        }

        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.job_feed_items || 'job_feed_items', queries);
        let items = (res.documents || []) as unknown as NormalizedRemoteJob[];

        if (query.trim()) {
          const q = query.trim().toLowerCase();
          items = items.filter(
            (j) =>
              j.title.toLowerCase().includes(q) ||
              j.company.toLowerCase().includes(q) ||
              (j.location || '').toLowerCase().includes(q) ||
              (j.description_excerpt || '').toLowerCase().includes(q),
          );
        }

        const actionMap = new Map<string, { status: UserJobActionStatus; applied_at?: string; saved_at?: string }>();
        if (user?.id && items.length > 0) {
          try {
            const itemIds = items.map((j) => j.$id).filter(Boolean) as string[];
            const actionsRes = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.user_job_actions || 'user_job_actions',
              [Query.equal('user_id', user.id), Query.equal('job_feed_item_id', itemIds), Query.limit(100)],
            );
            for (const doc of actionsRes.documents) {
              const item = doc as unknown as { job_feed_item_id: string; status: UserJobActionStatus; applied_at?: string; saved_at?: string };
              actionMap.set(item.job_feed_item_id, {
                status: item.status,
                applied_at: item.applied_at,
                saved_at: item.saved_at,
              });
            }
          } catch {
            // Non-critical action read
          }
        }

        return {
          jobs: items,
          total: res.total || items.length,
          isSynced: items.length > 0,
          lastSyncedAt: null,
          serverActions: actionMap,
        };
      } catch {
        // Fallback to DEV tier
        if (import.meta.env.DEV) {
          try {
            const [remotiveRes, jobicyRes] = await Promise.allSettled([
              fetch('https://remotive.com/api/remote-jobs').then((r) => r.json()),
              fetch('https://jobicy.com/api/v2/remote-jobs?count=20').then((r) => r.json()),
            ]);

            const devJobs: NormalizedRemoteJob[] = [];
            if (remotiveRes.status === 'fulfilled' && Array.isArray(remotiveRes.value?.jobs)) {
              devJobs.push(...remotiveRes.value.jobs.slice(0, 10).map(parseRemotiveJob).filter(Boolean));
            }
            if (jobicyRes.status === 'fulfilled' && Array.isArray(jobicyRes.value?.jobs)) {
              devJobs.push(...jobicyRes.value.jobs.slice(0, 10).map(parseJobicyJob).filter(Boolean));
            }

            return {
              jobs: devJobs,
              total: devJobs.length,
              isSynced: true,
              lastSyncedAt: null,
              serverActions: new Map(),
            };
          } catch {
            // Fall through to empty
          }
        }

        return {
          jobs: [],
          total: 0,
          isSynced: false,
          lastSyncedAt: null,
          serverActions: new Map(),
        };
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  // Merge server actions with any optimistic local actions
  const userActions = useMemo(() => {
    const merged = new Map(data?.serverActions ?? new Map());
    for (const [key, value] of optimisticActions.entries()) {
      merged.set(key, value);
    }
    return merged;
  }, [data?.serverActions, optimisticActions]);

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const isSynced = data?.isSynced ?? true;
  const lastSyncedAt = data?.lastSyncedAt ?? null;

  /**
   * Track user action
   */
  const trackAction = useCallback(
    async (
      job: NormalizedRemoteJob,
      action: 'save' | 'mark_applied' | 'dismiss' | 'undo' | 'mark_tailored' | 'mark_ready_to_apply',
      notes?: string,
      source_resume_id?: string,
      tailored_resume_id?: string,
      generated_cover_letter_id?: string,
    ) => {
      if (!user?.id) return { ok: false, error: 'Authentication required' };

      const itemId = job.$id || job.dedupe_key;
      const targetStatusMap: Record<string, UserJobActionStatus | null> = {
        save: 'saved',
        mark_applied: 'applied',
        dismiss: 'dismissed',
        mark_tailored: 'tailored',
        mark_ready_to_apply: 'ready_to_apply',
        undo: null,
      };

      const targetStatus = targetStatusMap[action];

      // Optimistic update
      setOptimisticActions((prev) => {
        const next = new Map(prev);
        if (targetStatus === null) {
          next.delete(itemId);
        } else {
          next.set(itemId, {
            status: targetStatus,
            applied_at: targetStatus === 'applied' ? new Date().toISOString() : prev.get(itemId)?.applied_at,
            saved_at: targetStatus === 'saved' ? new Date().toISOString() : prev.get(itemId)?.saved_at,
          });
        }
        return next;
      });

      try {
        try {
          const jwtRes = await account.createJWT().catch(() => null);
          const jwt = jwtRes?.jwt;

          const exec = await functions.createExecution(
            'track-job-action',
            JSON.stringify({
              job_feed_item_id: itemId,
              canonical_url: job.canonical_url,
              action,
              notes,
              source_resume_id,
              tailored_resume_id,
              generated_cover_letter_id,
              __headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
            }),
            false,
          );

          if (exec.status === 'completed' && exec.responseBody) {
            const res = JSON.parse(exec.responseBody);
            if (res.ok) return { ok: true };
          }
        } catch {
          // Fallback to direct DB write
        }

        const actionKey = `${user.id}:${itemId}`;
        const existingRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.user_job_actions || 'user_job_actions',
          [Query.equal('action_key', actionKey), Query.limit(1)],
        );

        const existingDoc = existingRes.documents?.[0];

        if (action === 'undo') {
          if (existingDoc) {
            await databases.deleteDocument(
              DATABASE_ID,
              COLLECTIONS.user_job_actions || 'user_job_actions',
              existingDoc.$id,
            );
          }
          return { ok: true };
        }

        const now = new Date().toISOString();
        const payload = {
          user_id: user.id,
          job_feed_item_id: itemId,
          canonical_url: job.canonical_url,
          status: targetStatus,
          applied_at: targetStatus === 'applied' ? now : existingDoc?.applied_at || null,
          saved_at: targetStatus === 'saved' ? now : existingDoc?.saved_at || null,
          dismissed_at: targetStatus === 'dismissed' ? now : existingDoc?.dismissed_at || null,
          source_resume_id: source_resume_id || existingDoc?.source_resume_id || null,
          tailored_resume_id: tailored_resume_id || existingDoc?.tailored_resume_id || null,
          generated_cover_letter_id: generated_cover_letter_id || existingDoc?.generated_cover_letter_id || null,
          action_key: actionKey,
        };

        if (existingDoc) {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.user_job_actions || 'user_job_actions',
            existingDoc.$id,
            payload,
          );
        } else {
          await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.user_job_actions || 'user_job_actions',
            ID.unique(),
            payload,
            [
              Permission.read(Role.user(user.id)),
              Permission.update(Role.user(user.id)),
              Permission.delete(Role.user(user.id)),
            ],
          );
        }

        return { ok: true };
      } catch (err: unknown) {
        void refetch();
        return { ok: false, error: err instanceof Error ? err.message : 'Failed to record job action' };
      }
    },
    [user?.id, refetch],
  );

  const roleGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      const rg = job.role_group || 'other';
      counts.set(rg, (counts.get(rg) || 0) + 1);
    }
    return counts;
  }, [jobs]);

  return {
    jobs,
    userActions,
    total,
    isLoading,
    isFetching,
    isSynced,
    lastSyncedAt,
    roleGroupCounts,
    error: queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null,
    refetch,
    trackAction,
  };
}
