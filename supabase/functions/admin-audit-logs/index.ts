/**
 * admin-audit-logs — Read/write access to the `audit_logs` table for the
 * DevKit admin panel.
 *
 * Trigger: invoked by the DevKit "Audit Log" pane (read mode) and by other
 *   admin functions/UI flows that need to record an entry (write mode).
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token). Non-admin
 *   callers get the standard 401/403 envelope from the shared helper.
 * Dispatch contract:
 *   body.mode === 'write' → insert one entry (`entry.user_id|category|action`
 *     required; `entry.metadata` optional). Returns `{success:true}`.
 *   body.mode unset/'read' → list entries with optional filters
 *     (`limit/offset/action_filter/category_filter/target_user_id/search/
 *     date_from/date_to`). Returns `{success:true, logs:[...], total:N}`
 *     with `user_email` enrichment from `profiles`.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-audit-logs", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      mode,
      limit = 50,
      offset = 0,
      action_filter,
      category_filter,
      target_user_id,
      search,
      date_from,
      date_to,
      entry,
    } = body as {
      mode?: 'read' | 'write';
      limit?: number;
      offset?: number;
      action_filter?: string | null;
      category_filter?: string | null;
      target_user_id?: string | null;
      search?: string | null;
      date_from?: string | null;
      date_to?: string | null;
      entry?: {
        user_id: string;
        category: string;
        action: string;
        metadata: Record<string, unknown>;
      };
    };

    try {
      await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Write mode: insert a single audit log entry via service role
    if (mode === 'write') {
      if (!entry || !entry.user_id || !entry.category || !entry.action) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required entry fields: user_id, category, action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          category: entry.category,
          action: entry.action,
          metadata: entry.metadata ?? {},
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Determine effective limit — if limit=0 or very large (for CSV export), allow up to 10000
    const effectiveLimit = limit === 0 ? 10000 : Math.min(limit, 500);
    const effectiveOffset = Math.max(0, offset);

    // If searching by email, first resolve to user_ids from profiles
    let searchUserIds: string[] | null = null;
    if (search && !target_user_id) {
      const trimmedSearch = search.trim();
      // Check if it looks like a UUID prefix (no @) or email
      const isEmailSearch = trimmedSearch.includes('@');
      if (isEmailSearch) {
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('email', `%${trimmedSearch}%`)
          .limit(50);
        searchUserIds = (matchingProfiles ?? []).map((p: { user_id: string }) => p.user_id);
      } else {
        // Treat as user_id prefix
        const { data: matchingProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .like('user_id', `${trimmedSearch}%`)
          .limit(50);
        searchUserIds = (matchingProfiles ?? []).map((p: { user_id: string }) => p.user_id);
      }

      // If no matching users found, return empty
      if (searchUserIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, logs: [], total: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Build count query
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (target_user_id) {
      countQuery = countQuery.eq('user_id', target_user_id);
    } else if (searchUserIds) {
      countQuery = countQuery.in('user_id', searchUserIds);
    }
    if (action_filter) countQuery = countQuery.eq('action', action_filter);
    if (category_filter) countQuery = countQuery.eq('category', category_filter);
    if (date_from) countQuery = countQuery.gte('created_at', date_from);
    if (date_to) countQuery = countQuery.lte('created_at', date_to);

    const { count: totalCount } = await countQuery;

    // Default: read mode — list audit log entries
    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, category, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

    if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    } else if (searchUserIds) {
      query = query.in('user_id', searchUserIds);
    }

    if (action_filter) {
      query = query.eq('action', action_filter);
    }

    if (category_filter) {
      query = query.eq('category', category_filter);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    const { data: logsData, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return new Response(
          JSON.stringify({ success: true, logs: [], total: 0, message: 'audit_logs table not found. Ensure the database migration has been applied.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const logs = logsData ?? [];

    // Enrich logs with user email from profiles.
    // user_id may be null for admin_email actions targeting non-existent recipients —
    // filter nulls before the .in() call (null in .in() does not match IS NULL in SQL).
    if (logs.length > 0) {
      const nonNullUserIds = [...new Set(
        (logs as { user_id: string | null }[]).map(l => l.user_id).filter((id): id is string => id != null)
      )];
      const emailMap: Record<string, string> = {};
      if (nonNullUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', nonNullUserIds);
        if (profiles) {
          for (const p of profiles as { user_id: string; email: string }[]) {
            emailMap[p.user_id] = p.email;
          }
        }
      }

      const enrichedLogs = logs.map((l: { user_id: string | null; metadata?: Record<string, unknown>; [key: string]: unknown }) => ({
        ...l,
        // For null-user-id rows (unknown recipients), fall back to metadata.target_email
        user_email: l.user_id ? (emailMap[l.user_id] ?? null) : ((l.metadata?.target_email as string | undefined) ?? null),
      }));

      return new Response(
        JSON.stringify({ success: true, logs: enrichedLogs, total: totalCount ?? enrichedLogs.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, logs, total: totalCount ?? logs.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
