import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

// Extend the global scope with the Deno namespace for type checking
declare global {
  interface ImportMeta {
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

interface ResumeData {
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  skills: (string | { name?: string })[];
}

interface LinkedInOptimizeRequest {
  resume: ResumeData;
  targetRole?: string;
  region?: 'global' | 'gcc' | 'emea' | 'apac' | 'americas';
  userGeminiKey?: string;
}

/** Safely extract skills as a comma-separated string */
function safeSkillsString(skills: unknown): string {
  if (!Array.isArray(skills)) return 'Not listed';
  return skills.map(s => typeof s === 'string' ? s : (s as any)?.name || String(s)).join(', ') || 'Not listed';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'linkedin_opt' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, targetRole, region = 'global' }: LinkedInOptimizeRequest = await req.json();

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const regionContext: Record<string, string> = {
      global: 'Use internationally recognized terminology and avoid region-specific idioms.',
      gcc: 'Consider Gulf Cooperation Council business culture. Emphasize stability, respect for hierarchy, and relationship building.',
      emea: 'Balance European formality with Middle Eastern relationship focus. Highlight international experience.',
      apac: 'Consider Asia-Pacific business values: collective achievement, continuous learning, and respect for experience.',
      americas: 'Use direct, achievement-focused language common in North and South American business culture.',
    };

    const resumeContext = `
Name: ${resume.contactInfo.fullName}
Current/Recent Role: ${resume.experience?.[0]?.position || 'Not specified'} at ${resume.experience?.[0]?.company || 'Not specified'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${safeSkillsString(resume.skills)}
Experience Highlights: ${resume.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join('; ') || 'Not listed'}
Education: ${resume.education?.[0]?.degree} in ${resume.education?.[0]?.field} from ${resume.education?.[0]?.institution || 'Not listed'}
${targetRole ? `Target Role: ${targetRole}` : ''}
`;

    const prompt = `You are a LinkedIn optimization expert who helps professionals create compelling profiles.

${regionContext[region]}

Based on this resume data:
${resumeContext}

Generate a comprehensive LinkedIn optimization package. Return a JSON object with this structure:

{
  "headlines": ["<5 compelling LinkedIn headline options, 120 chars max each>"],
  "aboutSections": {
    "short": "<150 words>",
    "medium": "<300 words>",
    "long": "<500 words>"
  },
  "experienceRewrites": [
    {
      "original": "<original>",
      "linkedin": "<rewritten>",
      "position": "<job title>",
      "company": "<company>"
    }
  ],
  "suggestedSkills": ["<15-20 skills>"],
  "keywords": ["<10-15 keywords>"],
  "tips": ["<3-5 tips>"]
}`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      userId: user.id,
    });

    const result = parseAIJSON(aiResponse.content || '{}');

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await recordUsage(user.id, 'linkedin_opt');

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('LinkedIn optimization error:', error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
