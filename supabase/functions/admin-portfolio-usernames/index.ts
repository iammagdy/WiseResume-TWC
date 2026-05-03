/**
 * admin-portfolio-usernames — Manage public portfolio usernames (the slug
 * users get under `https://wiseresume.com/p/<username>`): list, search,
 * reassign, release, and reserve.
 *
 * Trigger: DevKit "Portfolio Usernames" pane and the moderation/takedown
 *   workflow when a username needs to be released after a take-down.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token).
 * Dispatch contract: POST `{action, ...args}` where `action` ∈
 *   `'list' | 'search' | 'reserve' | 'release' | 'reassign'`. Mutating
 *   actions write a row to `audit_logs` (`category:'admin_portfolio'`).
 *   Returns 200 `{success:true, ...}` per branch; unknown action → 400.
 */
import { getServiceClient } from '../_shared/dbClient.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
type AnyRec = Record<string, unknown>;

function json(body: AnyRec, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanUsername(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

async function writeAudit(
  supabase: ReturnType<typeof getServiceClient>,
  adminEmail: string,
  action: string,
  targetUserId: string | null,
  metadata: AnyRec,
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: targetUserId,
      category: 'portfolio_username',
      action,
      metadata: { ...metadata, admin_email: adminEmail },
    });
  } catch {
    // never fail the mutation because audit logging failed
  }
}

Deno.serve(wrapHandler("admin-portfolio-usernames", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, ...rest } = body as { action: string } & AnyRec;

    let adminEmail: string;
    try {
      adminEmail = await requireAdminAuth(req);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    const supabase = getServiceClient();

    // ============================================================
    // DIRECTORY
    // ============================================================
    if (action === 'directory_list') {
      const search = String(rest.search ?? '').trim();
      const sort = String(rest.sort ?? 'newest');
      const page = Math.max(1, Number(rest.page ?? 1));
      const perPage = Math.min(200, Math.max(1, Number(rest.per_page ?? 50)));
      const offset = (page - 1) * perPage;

      let query = supabase
        .from('profiles')
        .select(
          'user_id, username, full_name, email, portfolio_enabled, updated_at, created_at',
          { count: 'exact' },
        )
        .not('username', 'is', null);

      if (search) {
        const s = search.toLowerCase();
        query = query.or(
          `username.ilike.%${s}%,email.ilike.%${s}%,full_name.ilike.%${s}%`,
        );
      }

      switch (sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true, nullsFirst: false });
          break;
        case 'username_asc':
          query = query.order('username', { ascending: true });
          break;
        case 'username_desc':
          query = query.order('username', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false, nullsFirst: false });
          break;
      }

      const { data, error, count } = await query.range(offset, offset + perPage - 1);
      if (error) return json({ success: false, error: error.message }, 500, corsHeaders);

      return json({ success: true, rows: data ?? [], total: count ?? 0 }, 200, corsHeaders);
    }

    if (action === 'directory_rename') {
      const userId = String(rest.user_id ?? '');
      const newUsername = cleanUsername(rest.new_username);
      if (!userId || !newUsername) return json({ success: false, error: 'user_id and new_username required' }, 400, corsHeaders);

      // Validate availability via RPC
      const { data: avail, error: availErr } = await supabase.rpc('check_username_available', {
        p_username: newUsername,
        p_user_id: userId,
      });
      if (availErr) return json({ success: false, error: availErr.message }, 500, corsHeaders);
      const status = (avail as { status?: string } | null)?.status ?? 'invalid';
      if (status !== 'available') {
        return json({ success: false, error: `Username not available (${status})`, status }, 409, corsHeaders);
      }

      const { data: oldRow } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', userId)
        .maybeSingle();

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', userId);
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      // The canonical username lives on `public.profiles` — the
      // `public.portfolios` table does not exist on this Supabase project,
      // so the Phase 3 FK cutover that this block would have driven was
      // never landed (see migrations 20260418195801 / 20260418195803 /
      // 20260419000000 header notes). The `profiles.username` update above
      // is the only write path needed here.

      await writeAudit(supabase, adminEmail, 'rename_username', userId, {
        old_username: oldRow?.username ?? null,
        new_username: newUsername,
      });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'directory_toggle_enabled') {
      const userId = String(rest.user_id ?? '');
      const enabled = Boolean(rest.enabled);
      if (!userId) return json({ success: false, error: 'user_id required' }, 400, corsHeaders);

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ portfolio_enabled: enabled })
        .eq('user_id', userId);
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, enabled ? 'enable_portfolio' : 'disable_portfolio', userId, {
        portfolio_enabled: enabled,
      });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'directory_release') {
      // Clear the username (also disables portfolio since it'd point to a dead URL)
      const userIds: string[] = Array.isArray(rest.user_ids) && rest.user_ids.length
        ? (rest.user_ids as unknown[]).map(String)
        : rest.user_id ? [String(rest.user_id)] : [];
      if (!userIds.length) return json({ success: false, error: 'user_id or user_ids required' }, 400, corsHeaders);

      const { data: rows } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ username: null, portfolio_enabled: false })
        .in('user_id', userIds);
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      for (const r of rows ?? []) {
        await writeAudit(supabase, adminEmail, 'release_username', r.user_id, {
          released_username: r.username,
        });
      }
      return json({ success: true, released: userIds.length }, 200, corsHeaders);
    }

    if (action === 'directory_bulk_disable') {
      const userIds = ((rest.user_ids as unknown[]) ?? []).map(String);
      if (!userIds.length) return json({ success: false, error: 'user_ids required' }, 400, corsHeaders);

      const { error: upErr } = await supabase
        .from('profiles')
        .update({ portfolio_enabled: false })
        .in('user_id', userIds);
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      for (const id of userIds) {
        await writeAudit(supabase, adminEmail, 'disable_portfolio', id, { bulk: true });
      }
      return json({ success: true, disabled: userIds.length }, 200, corsHeaders);
    }

    // ============================================================
    // RULES
    // ============================================================
    if (action === 'rules_get') {
      const { data: rules } = await supabase
        .from('portfolio_username_rules')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      const { data: overrides } = await supabase
        .from('portfolio_user_overrides')
        .select('user_id, min_length, max_length, allow_hyphens, note, updated_at');

      const userIds = (overrides ?? []).map((o: { user_id: string }) => o.user_id);
      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, username')
          .in('user_id', userIds);
        profileMap = Object.fromEntries(
          (profs ?? []).map((p: { user_id: string; email: string | null; full_name: string | null; username: string | null }) =>
            [p.user_id, { email: p.email, full_name: p.full_name, username: p.username }],
          ),
        );
      }

      return json({
        success: true,
        rules: rules ?? { id: 1, min_length: 3, max_length: 30, allow_hyphens: true },
        overrides: (overrides ?? []).map((o: { user_id: string; [k: string]: unknown }) => ({
          ...o,
          profile: profileMap[o.user_id] ?? null,
        })),
      }, 200, corsHeaders);
    }

    if (action === 'rules_update') {
      const min_length = Number(rest.min_length ?? 3);
      const max_length = Number(rest.max_length ?? 30);
      const allow_hyphens = Boolean(rest.allow_hyphens ?? true);
      if (!(min_length >= 1 && min_length <= 100 && max_length >= min_length && max_length <= 100)) {
        return json({ success: false, error: 'Invalid length bounds' }, 400, corsHeaders);
      }

      const { error: upErr } = await supabase
        .from('portfolio_username_rules')
        .update({ min_length, max_length, allow_hyphens, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'update_rules', null, { min_length, max_length, allow_hyphens });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'rules_override_upsert') {
      const userId = String(rest.user_id ?? '');
      if (!userId) return json({ success: false, error: 'user_id required' }, 400, corsHeaders);
      const min_length = rest.min_length === null || rest.min_length === undefined || rest.min_length === '' ? null : Number(rest.min_length);
      const max_length = rest.max_length === null || rest.max_length === undefined || rest.max_length === '' ? null : Number(rest.max_length);
      const allow_hyphens = rest.allow_hyphens === null || rest.allow_hyphens === undefined ? null : Boolean(rest.allow_hyphens);
      const note = String(rest.note ?? '');

      const { error: upErr } = await supabase
        .from('portfolio_user_overrides')
        .upsert({
          user_id: userId,
          min_length, max_length, allow_hyphens, note,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'upsert_user_override', userId, {
        min_length, max_length, allow_hyphens, note,
      });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'rules_override_delete') {
      const userId = String(rest.user_id ?? '');
      if (!userId) return json({ success: false, error: 'user_id required' }, 400, corsHeaders);
      const { error: delErr } = await supabase.from('portfolio_user_overrides').delete().eq('user_id', userId);
      if (delErr) return json({ success: false, error: delErr.message }, 500, corsHeaders);
      await writeAudit(supabase, adminEmail, 'delete_user_override', userId, {});
      return json({ success: true }, 200, corsHeaders);
    }

    // ============================================================
    // RESERVED
    // ============================================================
    if (action === 'reserved_list') {
      const { data, error } = await supabase
        .from('portfolio_reserved_usernames')
        .select('*')
        .order('username', { ascending: true });
      if (error) return json({ success: false, error: error.message }, 500, corsHeaders);
      return json({ success: true, rows: data ?? [] }, 200, corsHeaders);
    }

    if (action === 'reserved_add') {
      const username = cleanUsername(rest.username);
      const reason = String(rest.reason ?? '');
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);

      const { error: insErr } = await supabase
        .from('portfolio_reserved_usernames')
        .upsert({ username, reason }, { onConflict: 'username' });
      if (insErr) return json({ success: false, error: insErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'add_reserved', null, { username, reason });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'reserved_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);
      const { error: delErr } = await supabase
        .from('portfolio_reserved_usernames')
        .delete()
        .eq('username', username);
      if (delErr) return json({ success: false, error: delErr.message }, 500, corsHeaders);
      await writeAudit(supabase, adminEmail, 'delete_reserved', null, { username });
      return json({ success: true }, 200, corsHeaders);
    }

    // ============================================================
    // EXCLUSIVE
    // ============================================================
    if (action === 'exclusive_list') {
      const { data, error } = await supabase
        .from('portfolio_exclusive_assignments')
        .select('*')
        .order('username', { ascending: true });
      if (error) return json({ success: false, error: error.message }, 500, corsHeaders);

      const userIds = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))];
      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, username')
          .in('user_id', userIds);
        profileMap = Object.fromEntries(
          (profs ?? []).map((p: { user_id: string; email: string | null; full_name: string | null; username: string | null }) =>
            [p.user_id, { email: p.email, full_name: p.full_name, username: p.username }],
          ),
        );
      }

      return json({
        success: true,
        rows: (data ?? []).map((r: { user_id: string; [k: string]: unknown }) => ({
          ...r,
          profile: profileMap[r.user_id] ?? null,
        })),
      }, 200, corsHeaders);
    }

    if (action === 'exclusive_add') {
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      const email = String(rest.email ?? '').trim().toLowerCase();
      const note = String(rest.note ?? '');
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);

      let targetUserId = userId;
      if (!targetUserId && email) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', email)
          .maybeSingle();
        if (!prof?.user_id) return json({ success: false, error: `No user with email ${email}` }, 404, corsHeaders);
        targetUserId = prof.user_id;
      }
      if (!targetUserId) return json({ success: false, error: 'user_id or email required' }, 400, corsHeaders);

      const { error: insErr } = await supabase
        .from('portfolio_exclusive_assignments')
        .upsert({ username, user_id: targetUserId, note }, { onConflict: 'username' });
      if (insErr) return json({ success: false, error: insErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'add_exclusive', targetUserId, { username, note });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'exclusive_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);
      const { data: existing } = await supabase
        .from('portfolio_exclusive_assignments')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      const { error: delErr } = await supabase
        .from('portfolio_exclusive_assignments')
        .delete()
        .eq('username', username);
      if (delErr) return json({ success: false, error: delErr.message }, 500, corsHeaders);
      await writeAudit(supabase, adminEmail, 'delete_exclusive', existing?.user_id ?? null, { username });
      return json({ success: true }, 200, corsHeaders);
    }

    // ============================================================
    // PREMIUM HANDLES MARKETPLACE
    // ============================================================
    if (action === 'premium_list') {
      const { data, error } = await supabase
        .from('portfolio_premium_usernames')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return json({ success: false, error: error.message }, 500, corsHeaders);

      const userIds = (data ?? [])
        .map((r: { assigned_to_user_id: string | null }) => r.assigned_to_user_id)
        .filter(Boolean) as string[];

      let profileMap: Record<string, { email: string | null; full_name: string | null; username: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, email, full_name, username')
          .in('user_id', userIds);
        profileMap = Object.fromEntries(
          (profs ?? []).map((p: { user_id: string; email: string | null; full_name: string | null; username: string | null }) =>
            [p.user_id, { email: p.email, full_name: p.full_name, username: p.username }],
          ),
        );
      }

      return json({
        success: true,
        rows: (data ?? []).map((r: { assigned_to_user_id: string | null; [k: string]: unknown }) => ({
          ...r,
          profile: r.assigned_to_user_id ? (profileMap[r.assigned_to_user_id] ?? null) : null,
        })),
      }, 200, corsHeaders);
    }

    if (action === 'premium_add') {
      const username = cleanUsername(rest.username);
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);
      const price_cents = Math.max(0, Number(rest.price_cents ?? 0));
      const currency = String(rest.currency ?? 'usd').toLowerCase();
      const note = String(rest.note ?? '');

      const { error: upsertErr } = await supabase
        .from('portfolio_premium_usernames')
        .upsert(
          { username, price_cents, currency, note, updated_at: new Date().toISOString() },
          { onConflict: 'username' },
        );
      if (upsertErr) return json({ success: false, error: upsertErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'add_premium_handle', null, { username, price_cents, currency, note });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'premium_delete') {
      const username = cleanUsername(rest.username);
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);

      const { error: delErr } = await supabase
        .from('portfolio_premium_usernames')
        .delete()
        .eq('username', username);
      if (delErr) return json({ success: false, error: delErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'delete_premium_handle', null, { username });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'premium_assign') {
      // Manually complete an assignment after payment is confirmed outside the system.
      // Uses an atomic SQL function so that the profiles.username update and the
      // premium record status update happen in a single transaction — no partial state.
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      const email = String(rest.email ?? '').trim().toLowerCase();
      const note = String(rest.note ?? '');
      if (!username) return json({ success: false, error: 'username required' }, 400, corsHeaders);

      let targetUserId = userId;
      if (!targetUserId && email) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', email)
          .maybeSingle();
        if (!prof?.user_id) return json({ success: false, error: `No user with email ${email}` }, 404, corsHeaders);
        targetUserId = prof.user_id;
      }
      if (!targetUserId) return json({ success: false, error: 'user_id or email required' }, 400, corsHeaders);

      // Fetch old username for audit log before the atomic update
      const { data: oldRow } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', targetUserId)
        .maybeSingle();

      // Single transaction: validates handle state, updates profiles.username, marks assigned
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('assign_premium_handle', {
        p_username: username,
        p_target_user_id: targetUserId,
        p_admin_note: note || null,
      });
      if (rpcErr) return json({ success: false, error: rpcErr.message }, 500, corsHeaders);

      const result = rpcResult as { success: boolean; error?: string; price_cents?: number; currency?: string };
      if (!result.success) {
        const status = result.error?.includes('already assigned') ? 409 : 404;
        return json({ success: false, error: result.error ?? 'Assignment failed' }, status, corsHeaders);
      }

      await writeAudit(supabase, adminEmail, 'assign_premium_handle', targetUserId, {
        username,
        old_username: oldRow?.username ?? null,
        price_cents: result.price_cents,
        currency: result.currency,
        admin_note: note,
      });
      return json({ success: true }, 200, corsHeaders);
    }

    if (action === 'premium_mark_pending') {
      // Mark a handle as pending while waiting for payment confirmation.
      const username = cleanUsername(rest.username);
      const userId = String(rest.user_id ?? '');
      if (!username || !userId) return json({ success: false, error: 'username and user_id required' }, 400, corsHeaders);

      const { error: upErr } = await supabase
        .from('portfolio_premium_usernames')
        .update({
          status: 'pending',
          assigned_to_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('username', username)
        .eq('status', 'available');
      if (upErr) return json({ success: false, error: upErr.message }, 500, corsHeaders);

      await writeAudit(supabase, adminEmail, 'pending_premium_handle', userId, { username });
      return json({ success: true }, 200, corsHeaders);
    }

    // ============================================================
    // USER LOOKUP (for override + exclusive forms)
    // ============================================================
    if (action === 'user_search') {
      const q = String(rest.query ?? '').trim().toLowerCase();
      if (q.length < 2) return json({ success: true, rows: [] }, 200, corsHeaders);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, username')
        .or(`email.ilike.%${q}%,full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(10);
      if (error) return json({ success: false, error: error.message }, 500, corsHeaders);
      return json({ success: true, rows: data ?? [] }, 200, corsHeaders);
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400, corsHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: message }, 500, corsHeaders);
  }
}));
