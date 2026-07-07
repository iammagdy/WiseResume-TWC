import { useState, useEffect, useCallback, useMemo } from 'react';
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
  parseWwrRssItem,
  parseRemoteOkJob,
  parseArbeitnowJob,
} from '@/lib/remoteJobsFeed';

export type JobFilterOptions = {
  source?: JobSource | 'all';
  roleGroup?: RoleGroup | 'all';
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

export function useRemoteJobs(options: JobFilterOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<NormalizedRemoteJob[]>([]);
  const [userActions, setUserActions] = useState<Map<string, { status: UserJobActionStatus; applied_at?: string; saved_at?: string }>>(new Map());
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const {
    source = 'all',
    roleGroup = 'all',
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

  const fetchJobsFromAppwrite = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Attempt serverless function get-remote-jobs if available
      try {
        const jwtRes = isAuthenticated ? await account.createJWT().catch(() => null) : null;
        const jwt = jwtRes?.jwt;

        const exec = await functions.createExecution(
          'get-remote-jobs',
          JSON.stringify({
            source: source !== 'all' ? source : undefined,
            role_group: roleGroup !== 'all' ? roleGroup : undefined,
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
            setJobs(res.jobs);
            setTotal(res.total || res.jobs.length);
            if (res.last_synced_at) setLastSyncedAt(res.last_synced_at);

            // Populate user actions map if returned
            const actionMap = new Map();
            for (const item of res.jobs) {
              if (item.user_action) {
                actionMap.set(item.$id || item.dedupe_key, item.user_action);
              }
            }
            setUserActions(actionMap);
            setIsSynced(res.jobs.length > 0);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Function not deployed yet — fallback to direct Appwrite collection query
      }

      // 2. Direct Appwrite collection read fallback
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
      if (roleGroup !== 'all') {
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
          j =>
            j.title.toLowerCase().includes(q) ||
            j.company.toLowerCase().includes(q) ||
            (j.location || '').toLowerCase().includes(q) ||
            (j.description_excerpt || '').toLowerCase().includes(q),
        );
      }

      setJobs(items);
      setTotal(res.total || items.length);
      setIsSynced(items.length > 0);

      // Load user actions for these items if authenticated
      if (user?.id && items.length > 0) {
        try {
          const itemIds = items.map(j => j.$id).filter(Boolean) as string[];
          const actionsRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.user_job_actions || 'user_job_actions',
            [Query.equal('user_id', user.id), Query.equal('job_feed_item_id', itemIds), Query.limit(100)],
          );

          const actionMap = new Map();
          for (const doc of actionsRes.documents) {
            actionMap.set(doc.job_feed_item_id, {
              status: doc.status,
              applied_at: doc.applied_at,
              saved_at: doc.saved_at,
            });
          }
          setUserActions(actionMap);
        } catch {
          // Ignore action load errors
        }
      }
    } catch (err: any) {
      // In DEV mode, if Appwrite collections do not exist yet, allow local dev fallback
      if (import.meta.env.DEV) {
        try {
          const [remotiveRes, jobicyRes] = await Promise.allSettled([
            fetch('https://remotive.com/api/remote-jobs').then(r => r.json()),
            fetch('https://jobicy.com/api/v2/remote-jobs?count=20').then(r => r.json()),
          ]);

          const devJobs: NormalizedRemoteJob[] = [];
          if (remotiveRes.status === 'fulfilled' && Array.isArray(remotiveRes.value?.jobs)) {
            devJobs.push(...remotiveRes.value.jobs.slice(0, 10).map(parseRemotiveJob).filter(Boolean));
          }
          if (jobicyRes.status === 'fulfilled' && Array.isArray(jobicyRes.value?.jobs)) {
            devJobs.push(...jobicyRes.value.jobs.slice(0, 10).map(parseJobicyJob).filter(Boolean));
          }

          setJobs(devJobs);
          setTotal(devJobs.length);
          setIsSynced(true);
          setIsLoading(false);
          return;
        } catch {
          // Fallthrough to empty state
        }
      }

      // In Production, show clean unsynced / empty state
      setJobs([]);
      setTotal(0);
      setIsSynced(false);
      setError('Appwrite remote jobs feed is not synced yet.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated, source, roleGroup, category, query, page, limit, region_fit, seniority, has_salary, min_salary, salary_period, show_older]);

  useEffect(() => {
    void fetchJobsFromAppwrite();
  }, [fetchJobsFromAppwrite]);

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

      // Optimistic state update
      setUserActions(prev => {
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
        // Attempt track-job-action function call
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
          // Function fallback -> direct Appwrite Databases write
        }

        // Direct Appwrite collection upsert fallback
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
            [Permission.read(Role.user(user.id)), Permission.update(Role.user(user.id)), Permission.delete(Role.user(user.id))],
          );
        }

        return { ok: true };
      } catch (err: any) {
        // Rollback optimistic update on failure
        void fetchJobsFromAppwrite();
        return { ok: false, error: err.message || 'Failed to record job action' };
      }
    },
    [user?.id, fetchJobsFromAppwrite],
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
    isSynced,
    lastSyncedAt,
    roleGroupCounts,
    error,
    refetch: fetchJobsFromAppwrite,
    trackAction,
  };
}
