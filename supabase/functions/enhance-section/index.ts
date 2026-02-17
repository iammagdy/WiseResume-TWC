import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithRetry, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============= SECURITY: Input validation limits =============
const MAX_CONTENT_SIZE = 50 * 1024; // 50KB for current content
const MAX_CONTEXT_SIZE = 100 * 1024; // 100KB for context (resume data)
const VALID_SECTIONS = ['summary', 'experience', 'education', 'skills', 'contact', 'custom'];
const VALID_ACTIONS = ['generate', 'improve', 'ats_improve', 'ats_optimize', 'shorten', 'expand', 'add_metrics', 'generate_bullets', 'fix_error', 'custom'];

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

function getSchemaInstructions(section: string, currentContent: unknown): string {
  switch (section) {
    case 'summary':
      return `Return "improved" as a plain string (the enhanced summary text).`;
    case 'experience':
      return `Return "improved" as a JSON array of experience objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "company": "<string>",
  "position": "<string>",
  "startDate": "<string, e.g. Jan 2020>",
  "endDate": "<string, e.g. Present>",
  "current": <boolean>,
  "description": "<string — a brief role summary>",
  "achievements": ["<string>", "<string>"],
  "responsibilities": ["<string>", "<string>"]
}
You MUST preserve all original "id" values. Do NOT omit any field. If a field was empty, keep it as empty string or empty array.
Here are the exact IDs and structure you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, company: e.company, position: e.position, startDate: e.startDate, endDate: e.endDate, current: e.current
})), null, 2)}`;
    case 'education':
      return `Return "improved" as a JSON array of education objects. Each object MUST have EXACTLY these fields:
{
  "id": "<PRESERVE the original id exactly>",
  "institution": "<string>",
  "degree": "<string>",
  "field": "<string>",
  "startDate": "<string>",
  "endDate": "<string>",
  "gpa": "<string or empty string>"
}
You MUST preserve all original "id" values. Do NOT omit any field.
Here are the exact IDs you must preserve:
${JSON.stringify((Array.isArray(currentContent) ? currentContent : []).map((e: Record<string, unknown>) => ({
  id: e.id, institution: e.institution, degree: e.degree
})), null, 2)}`;
    case 'skills':
      return `Return "improved" as a flat JSON array of strings ONLY. Example: ["Python", "React", "AWS", "Leadership"]. Do NOT return objects like {"name":"Python","level":"Expert"} — only plain strings.`;
    default:
      return `Return "improved" in the same format as the input.`;
  }
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
    ats_improve: `Optimize this resume section specifically for ATS (Applicant Tracking System) compatibility and scoring. Your goal is to INCREASE the ATS score across these 6 weighted pillars used by real ATS systems (Greenhouse, Lever, Workday):

1. KEYWORD OPTIMIZATION (35% of score): Add industry-relevant keywords, hard/soft skills, tools, technologies, and certifications naturally throughout. Use standard industry terminology that ATS parsers recognize.
2. CONTENT QUALITY (25% of score): Every bullet must start with a strong past-tense action verb (Led, Delivered, Optimized, Architected, Spearheaded, Streamlined). Add quantified achievements with specific metrics (%, $, team sizes, timeframes).
3. SECTION STRUCTURE (15% of score): Use standard ATS-recognized section headers. Ensure logical ordering and no missing critical content.
4. PARSABILITY (10% of score): Use clean text without special characters. Ensure consistent date formats (Month YYYY). Use standard job titles.
5. CONTACT COMPLETENESS (10% of score): Preserve all contact information exactly as given.
6. LENGTH & DENSITY (5% of score): Ensure rich, meaningful content — no filler. Each bullet should demonstrate clear impact.

Critical Rules:
- NEVER remove existing content, keywords, or information — only ADD and IMPROVE
- Preserve ALL dates, company names, job titles, and factual information EXACTLY as given
- For skills sections, include both specific technical skills AND broader category keywords
- For experience sections, ensure each bullet starts with a past-tense action verb and includes a measurable outcome`,
    ats_optimize: `Optimize this content for Applicant Tracking Systems (ATS). Add relevant industry keywords, use standard section headers, avoid special characters, and ensure the format is easily parseable by automated systems.`,
    shorten: `Make this content more concise while retaining the most impactful information. Remove filler words, combine related points, and prioritize the most impressive achievements.`,
    expand: `Expand this content with more detail. Add context, specific achievements, technologies used, and measurable outcomes where appropriate.`,
    add_metrics: `Add quantifiable metrics and numbers to this content. Suggest specific percentages, dollar amounts, time saved, team sizes, or other measurable outcomes based on the role and industry.`,
    generate_bullets: `Convert this description into powerful bullet points. Each bullet should start with a strong action verb and include a specific achievement or responsibility.`,
    fix_error: `Apply the following fix to the content: "${fixInstruction}". Keep the rest of the content consistent, but ensure the specific issue is resolved. Do not invent false information, but you may rephrase or restructure as needed to apply the fix effectively.`,
    custom: `${fixInstruction || String(currentContent)}. Respond with valid JSON only.`
  };

  const schemaInstructions = getSchemaInstructions(section, currentContent);

  return baseContext + '\n\nTask: ' + (actionPrompts[action] || actionPrompts.improve) + `

CRITICAL RESPONSE FORMAT: Respond with ONLY valid JSON, no markdown or code blocks. All text values must be plain text WITHOUT any Markdown formatting (no **, *, #, _, or backticks).

${schemaInstructions}

Full response structure:
{
  "improved": <see schema instructions above>,
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
    const temperature = action === 'ats_improve' ? 0.3 : 0.7;
    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature,
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
