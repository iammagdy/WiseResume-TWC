import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { user_id, action } = await req.json()

  if (action !== 'HARD_PURGE') {
    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Permanent removal from primary tables
  // Note: cascades handle child tables
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', user_id)

  const { error: resumeError } = await supabase
    .from('resumes')
    .delete()
    .eq('user_id', user_id)

  if (profileError || resumeError) {
    return new Response(JSON.stringify({ profileError, resumeError }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, message: `Permanently purged user ${user_id}` }), { status: 200 })
})
