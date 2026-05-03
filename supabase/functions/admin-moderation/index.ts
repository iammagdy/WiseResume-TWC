/**
 * admin-moderation — Review queue + take-down actions for user-generated
 * content (public portfolios, bios, custom domains) flagged either by
 * automated rules or by user reports.
 *
 * Trigger: DevKit "Moderation" pane (queue list + per-item action) and
 *   the in-product "Report" button which feeds the same queue.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{action, ...args}` where `action` ∈
 *   `'list-queue' | 'review-item' | 'takedown' | 'restore'`. Mutating
 *   actions write to `moderation_decisions` + `audit_logs`. Returns
 *   200 `{success:true, ...}` per branch; unknown action → 400.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler("admin-moderation", async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  let callerEmail: string;
  try {
    callerEmail = await requireAdminAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const supabase = getServiceClient();
  const body = req.method === 'GET' ? {} : await req.json();
  const action: string = body.action ?? '';

  // ── LIST BUG REPORTS ───────────────────────────────────────────────────
  if (action === 'list_bug_reports') {
    const { status_filter, page = 1, per_page = 50 } = body as {
      status_filter?: string;
      page?: number;
      per_page?: number;
    };

    let query = supabase
      .from('bug_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * per_page, page * per_page - 1);

    if (status_filter && status_filter !== 'all') {
      query = query.eq('status', status_filter);
    }

    const { data, error, count } = await query;
    if (error) return json({ success: false, error: error.message }, 500, cors);

    return json({ success: true, bug_reports: data ?? [], total: count ?? 0 }, 200, cors);
  }

  // ── UPDATE BUG REPORT ──────────────────────────────────────────────────
  if (action === 'update_bug_report') {
    const { report_id, status, private_note } = body as {
      report_id?: string;
      status?: string;
      private_note?: string;
    };

    if (!report_id) return json({ success: false, error: 'report_id is required' }, 400, cors);

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (private_note !== undefined) updates.private_note = private_note;

    if (Object.keys(updates).length === 0) {
      return json({ success: false, error: 'No fields to update' }, 400, cors);
    }

    const { error } = await supabase
      .from('bug_reports')
      .update(updates)
      .eq('id', report_id);

    if (error) return json({ success: false, error: error.message }, 500, cors);

    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_moderation',
      action: 'bug_report_updated',
      metadata: { report_id, updates, performed_by: callerEmail },
    }).catch(() => {});

    return json({ success: true }, 200, cors);
  }

  // ── LIST BLOCKLIST ─────────────────────────────────────────────────────
  if (action === 'list_blocklist') {
    const { data, error } = await supabase
      .from('blocklist')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return json({ success: true, entries: [], missing_table: true }, 200, cors);
      return json({ success: false, error: error.message }, 500, cors);
    }

    return json({ success: true, entries: data ?? [] }, 200, cors);
  }

  // ── ADD BLOCKLIST ──────────────────────────────────────────────────────
  if (action === 'add_blocklist') {
    const { type, value, reason } = body as {
      type?: string;
      value?: string;
      reason?: string;
    };

    if (!type || !value) return json({ success: false, error: 'type and value are required' }, 400, cors);
    if (!['email', 'user_id', 'pattern'].includes(type)) {
      return json({ success: false, error: 'type must be email, user_id, or pattern' }, 400, cors);
    }

    // Normalize email values to lowercase for deterministic matching.
    const normalizedValue = type === 'email' ? value.trim().toLowerCase() : value.trim();

    const { data, error } = await supabase
      .from('blocklist')
      .insert({ type, value: normalizedValue, reason: reason ?? null, added_by: callerEmail })
      .select()
      .maybeSingle();

    if (error) return json({ success: false, error: error.message }, 500, cors);
    if (!data) return json({ success: false, error: 'not_found' }, 404, cors);

    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_moderation',
      action: 'blocklist_entry_added',
      metadata: { type, value, reason, performed_by: callerEmail },
    }).catch(() => {});

    return json({ success: true, entry: data }, 200, cors);
  }

  // ── REMOVE BLOCKLIST ───────────────────────────────────────────────────
  if (action === 'remove_blocklist') {
    const { entry_id } = body as { entry_id?: string };

    if (!entry_id) return json({ success: false, error: 'entry_id is required' }, 400, cors);

    const { data: existing } = await supabase
      .from('blocklist')
      .select('type, value')
      .eq('id', entry_id)
      .maybeSingle();

    const { error } = await supabase.from('blocklist').delete().eq('id', entry_id);
    if (error) return json({ success: false, error: error.message }, 500, cors);

    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_moderation',
      action: 'blocklist_entry_removed',
      metadata: { entry_id, removed_entry: existing, performed_by: callerEmail },
    }).catch(() => {});

    return json({ success: true }, 200, cors);
  }

  // ── LIST MODERATION QUEUE ──────────────────────────────────────────────
  if (action === 'list_moderation_queue') {
    const { status_filter } = body as { status_filter?: string };

    let query = supabase
      .from('moderation_queue')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100);

    if (status_filter && status_filter !== 'all') {
      query = query.eq('status', status_filter);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === '42P01') return json({ success: true, items: [], total: 0, missing_table: true }, 200, cors);
      return json({ success: false, error: error.message }, 500, cors);
    }

    return json({ success: true, items: data ?? [], total: count ?? 0 }, 200, cors);
  }

  // ── REVIEW QUEUE ITEM ──────────────────────────────────────────────────
  if (action === 'review_queue_item') {
    const { item_id, decision, suspend_user } = body as {
      item_id?: string;
      decision?: 'approved' | 'removed';
      suspend_user?: boolean;
    };

    if (!item_id) return json({ success: false, error: 'item_id is required' }, 400, cors);
    if (!decision || !['approved', 'removed'].includes(decision)) {
      return json({ success: false, error: 'decision must be approved or removed' }, 400, cors);
    }

    const { data: item } = await supabase
      .from('moderation_queue')
      .select('reporter_user_id, content_type, content_id')
      .eq('id', item_id)
      .maybeSingle();

    const { error } = await supabase
      .from('moderation_queue')
      .update({ status: decision, reviewed_by: callerEmail, reviewed_at: new Date().toISOString() })
      .eq('id', item_id);

    if (error) return json({ success: false, error: error.message }, 500, cors);

    // For "removed" decisions, attempt to delete the underlying content by type.
    let contentDeleted = false;
    if (decision === 'removed' && item?.content_id) {
      const contentType = item.content_type?.toLowerCase() ?? '';
      const contentId = item.content_id;

      // Map known content types to their tables and PK columns.
      const contentTypeMap: Record<string, string> = {
        bug_report: 'bug_reports',
        portfolio_item: 'portfolio_projects',
        portfolio_project: 'portfolio_projects',
        comment: 'comments',
        message: 'messages',
      };

      const table = contentTypeMap[contentType];
      if (table) {
        const { error: deleteError } = await supabase.from(table).delete().eq('id', contentId);
        contentDeleted = !deleteError;
      }
    }

    if (suspend_user && item?.reporter_user_id) {
      await supabase.rpc('admin_suspend_user', {
        p_target_user_id: item.reporter_user_id,
        p_suspend: true,
        p_reason: `Suspended via moderation review (item: ${item_id})`,
      }).catch(() => {});
    }

    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_moderation',
      action: 'queue_item_reviewed',
      metadata: { item_id, decision, suspend_user, content_deleted: contentDeleted, performed_by: callerEmail },
    }).catch(() => {});

    return json({ success: true, content_deleted: contentDeleted }, 200, cors);
  }

  // ── SUPPRESS EMAIL ─────────────────────────────────────────────────────
  // Shortcut: add a bounced/complained email address to the blocklist.
  if (action === 'suppress_email') {
    const { email: emailToSuppress, reason } = body as { email?: string; reason?: string };
    if (!emailToSuppress) return json({ success: false, error: 'email is required' }, 400, cors);

    const normalized = emailToSuppress.trim().toLowerCase();

    // Check if already blocked to avoid duplicates.
    const { data: existing } = await supabase
      .from('blocklist')
      .select('id')
      .eq('type', 'email')
      .eq('value', normalized)
      .maybeSingle();

    if (existing) {
      return json({ success: true, already_blocked: true }, 200, cors);
    }

    const { data, error } = await supabase
      .from('blocklist')
      .insert({ type: 'email', value: normalized, reason: reason ?? 'Email suppressed due to bounce/complaint', added_by: callerEmail })
      .select()
      .maybeSingle();

    if (error) return json({ success: false, error: error.message }, 500, cors);
    if (!data) return json({ success: false, error: 'not_found' }, 404, cors);

    await supabase.from('audit_logs').insert({
      user_id: null,
      category: 'admin_moderation',
      action: 'email_suppressed',
      metadata: { email: emailToSuppress, performed_by: callerEmail },
    }).catch(() => {});

    return json({ success: true, entry: data }, 200, cors);
  }

  // ── LIST KINDE EVENTS ──────────────────────────────────────────────────
  if (action === 'list_kinde_events') {
    const { event_type, limit = 100 } = body as {
      event_type?: string;
      limit?: number;
    };

    let query = supabase
      .from('kinde_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200));

    if (event_type && event_type !== 'all') {
      query = query.eq('event_type', event_type);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === '42P01') return json({ success: true, events: [], total: 0, missing_table: true }, 200, cors);
      return json({ success: false, error: error.message }, 500, cors);
    }

    return json({ success: true, events: data ?? [], total: count ?? 0 }, 200, cors);
  }

  return json({ success: false, error: `Unknown action: ${action}` }, 400, cors);
}));
