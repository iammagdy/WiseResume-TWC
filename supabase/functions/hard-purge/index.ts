import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { requireAdminAuth } from "../_shared/adminAuth.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

/**
 * hard-purge — permanently deletes ALL data for a user across all user-owned tables.
 *
 * SECURITY: Requires admin authentication via the DevKit session token or raw admin
 * password. Unauthenticated calls are rejected with 401. The `action` field must be
 * the literal string 'HARD_PURGE' to prevent accidental invocation.
 *
 * Tables explicitly purged (in dependency order, child tables first):
 *   tailoring_results, rpc_rate_limits, notifications,
 *   user_api_keys, user_preferences, ai_credits, subscriptions,
 *   job_applications, portfolios, resumes, profiles
 *
 * Finally the Supabase auth user record is deleted, which removes the account.
 */
serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let body: { user_id?: string; action?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { user_id, action, password = '' } = body

  // Require admin authentication before doing anything
  try {
    await requireAdminAuth(req, password, corsHeaders)
  } catch (authResponse) {
    if (authResponse instanceof Response) return authResponse
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action !== 'HARD_PURGE') {
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!user_id || typeof user_id !== 'string') {
    return new Response(JSON.stringify({ error: 'user_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const errors: Record<string, unknown> = {}

  // Delete in dependency order: child tables before parent tables.
  // We delete each table explicitly rather than relying on cascades so that
  // the purge is auditable and unaffected by FK constraint changes.

  // ── Child tables ────────────────────────────────────────────────────────
  const childTables = [
    'tailoring_results',
    'rpc_rate_limits',
    'notifications',
    'user_api_keys',
    'user_preferences',
    'ai_credits',
    'subscriptions',
    'job_applications',
    'portfolios',
  ]

  for (const table of childTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', user_id)
    if (error) {
      console.warn(`[hard-purge] Non-fatal error deleting ${table}:`, error.message)
      errors[table] = error.message
    }
  }

  // ── Parent tables ───────────────────────────────────────────────────────
  const { error: resumeError } = await supabase.from('resumes').delete().eq('user_id', user_id)
  if (resumeError) {
    console.error('[hard-purge] Error deleting resumes:', resumeError.message)
    errors['resumes'] = resumeError.message
  }

  const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', user_id)
  if (profileError) {
    console.error('[hard-purge] Error deleting profile:', profileError.message)
    errors['profiles'] = profileError.message
  }

  // ── Delete the Supabase auth user ───────────────────────────────────────
  const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
  if (authError) {
    console.error('[hard-purge] Error deleting auth user:', authError.message)
    errors['auth_user'] = authError.message
  }

  const hasErrors = Object.keys(errors).length > 0
  if (hasErrors) {
    console.error('[hard-purge] Completed with errors for user', user_id, errors)
    return new Response(
      JSON.stringify({ success: false, partialErrors: errors, message: `Purge completed with some errors for user ${user_id}` }),
      { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[hard-purge] Successfully purged all data for user ${user_id}`)
  return new Response(
    JSON.stringify({ success: true, message: `Permanently purged all data for user ${user_id}` }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
