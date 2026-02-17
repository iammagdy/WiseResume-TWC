import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============= SECURITY: Input validation limits =============
const MAX_CONTENT_SIZE = 50 * 1024; // 50KB for current content
const MAX_CONTEXT_SIZE = 100 * 1024; // 100KB for context (resume data)
const VALID_SECTIONS = ['summary', 'experience', 'education', 'skills', 'contact', 'custom'];
const VALID_ACTIONS = ['generate', 'improve', 'ats_optimize', 'shorten', 'expand', 'add_metrics', 'generate_bullets', 'fix_error', 'custom'];

interface EnhanceRequest {
  section: 'summary' | 'experience' | 'education' | 'skills' | 'contact';
  action: 'generate' | 'improve' | 'ats_optimize' | 'shorten' | 'expand' | 'add_metrics' | 'generate_bullets' | 'fix_error';
  currentContent: unknown;
  fixInstruction?: string;
  context: {
    resume: unknown;
    jobDescription?: string;
  };
  userGeminiKey?: string;
}

function buildPrompt(section: string, action: string, currentContent: unknown, context: unknown, fixInstruction?: string): string {
  const baseContext = `You are an expert resume writer and career coach. Your goal is to help users create compelling, ATS-friendly resume content.

Current resume context:
${JSON.stringify(context, null, 2)}

Section to enhance: ${section}
Current content:
${JSON.stringify(currentContent, null, 2)}
`;

  const actionPrompts: Record<string, string> = {
    generate: `Generate compelling, professional content for this section from scratch based on the resume context. Use strong action verbs, quantify achievements where possible, and ensure ATS compatibility.`,
    improve: `Improve the existing content to be more impactful and professional. Use stronger action verbs, better phrasing, and ensure it's concise yet comprehensive. Keep the same information but express it more effectively.`,
    ats_optimize: `Optimize this content for Applicant Tracking Systems (ATS). Add relevant industry keywords, use standard section headers, avoid special characters, and ensure the format is easily parseable by automated systems.`,
    shorten: `Make this content more concise while retaining the most impactful information. Remove filler words, combine related points, and prioritize the most impressive achievements.`,
    expand: `Expand this content with more detail. Add context, specific achievements, technologies used, and measurable outcomes where appropriate.`,
    add_metrics: `Add quantifiable metrics and numbers to this content. Suggest specific percentages, dollar amounts, time saved, team sizes, or other measurable outcomes based on the role and industry.`,
    generate_bullets: `Convert this description into powerful bullet points. Each bullet should start with a strong action verb and include a specific achievement or responsibility.`,
    fix_error: `Apply the following fix to the content: "${fixInstruction}". Keep the rest of the content consistent, but ensure the specific issue is resolved. Do not invent false information, but you may rephrase or restructure as needed to apply the fix effectively.`,
    custom: `${fixInstruction || String(currentContent)}. Respond with valid JSON only.`
  };

  return baseContext + '\n\nTask: ' + (actionPrompts[action] || actionPrompts.improve) + `

IMPORTANT: Respond with ONLY valid JSON in this exact format, no markdown or code blocks:
{
  "improved": <the enhanced content - string for summary, object for experience/education, array for skills>,
  "changes": ["<change 1>", "<change 2>"],
  "suggestions": ["<optional suggestion 1>"]
}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    // Server-side rate limiting
    const rateCheck = await checkRateLimit(userId, { maxRequests: 20, windowSeconds: 60, actionType: 'enhance' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as EnhanceRequest & { content?: string; instruction?: string };
    const section = body.section;
    const action = body.action || (section === 'custom' ? 'custom' : undefined);
    const currentContent = body.currentContent ?? body.content;
    const context = body.context;
    // userGeminiKey removed
    const fixInstruction = body.fixInstruction ?? body.instruction;

    // ============= SECURITY: Input validation =============
    if (!section || !VALID_SECTIONS.includes(section)) {
      return new Response(
        JSON.stringify({ error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentStr = JSON.stringify(currentContent || '');
    if (contentStr.length > MAX_CONTENT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Content is too large. Maximum size is ${MAX_CONTENT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contextStr = JSON.stringify(context || {});
    if (contextStr.length > MAX_CONTEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Context is too large. Maximum size is ${MAX_CONTEXT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enhancing ${section} with action: ${action}`);

    const prompt = buildPrompt(section, action, currentContent, context, fixInstruction);

    // Call AI using the shared client
    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      userId: user.id,
    });

    const content = aiResponse.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse the JSON from the AI response — never inject raw text into resume
    const enhancedContent = parseAIJSON(content);

    if (!enhancedContent) {
      console.error("Failed to parse enhance AI response:", content?.slice(0, 500));
      return new Response(JSON.stringify({
        error: 'enhancement_failed',
        message: 'AI response was malformed. Please try again.',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Enhancement complete:', JSON.stringify(enhancedContent).slice(0, 200));

    // Record usage for rate limiting
    await recordUsage(userId, 'enhance', { section, action });

    return new Response(JSON.stringify(enhancedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhancement error:', error);

    if (isAIError(error)) {
      const errorMap: Record<string, { error: string; message: string }> = {
        'invalid_key': { error: 'invalid_key', message: 'Invalid Gemini API key. Please check your AI settings.' },
        'rate_limit': { error: 'rate_limit', message: 'Too many requests. Please wait a moment and try again.' },
        'payment_required': { error: 'payment_required', message: 'AI credits exhausted. Please check your account.' },
        'quota_exceeded': { error: 'quota_exceeded', message: 'Daily quota exceeded. Try again tomorrow or use a paid key.' },
      };
      const mapped = errorMap[error.type] || { error: error.type, message: error.message };
      return new Response(JSON.stringify(mapped), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'enhancement_failed',
      message: 'Failed to enhance content. Please try again.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
