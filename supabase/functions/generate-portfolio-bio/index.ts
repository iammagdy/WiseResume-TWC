import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAI, sanitizeInputText } from '../_shared/aiClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { summary, fullName, jobTitle } = await req.json();

    if (!summary && !jobTitle) {
      return new Response(JSON.stringify({ error: 'Please provide a resume summary or job title' }), { status: 400, headers: corsHeaders });
    }

    // Increment AI usage
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await serviceClient.rpc('increment_ai_usage', { p_user_id: userId });

    const sanitizedSummary = summary ? sanitizeInputText(summary, 2000) : '';

    const prompt = `You are a personal branding expert. Rewrite this professional information into a warm, friendly, first-person "About Me" bio for a personal portfolio website.

Name: ${fullName || 'the user'}
Job Title: ${jobTitle || 'Professional'}
Resume Summary: ${sanitizedSummary || 'Not provided'}

Requirements:
- Write in first person ("I", "my")
- Keep it under 120 words
- Make it warm, human, and conversational — NOT corporate
- Highlight what excites them about their work
- End with something personal or aspirational
- Do NOT use clichés like "results-oriented" or "passionate professional"
- Return ONLY the bio text, no quotes or labels`;

    const response = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      maxTokens: 300,
      userId,
    });

    const bio = response.content?.trim() || '';

    return new Response(JSON.stringify({ bio }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-portfolio-bio error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate bio' }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
