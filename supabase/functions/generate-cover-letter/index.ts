import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, sanitizeInputText, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const safeSkillsString = (skills: any[] | undefined): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

const MAX_RESUME_SIZE = 100 * 1024;
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024;
const VALID_TONES = ['professional', 'enthusiastic', 'conversational'];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'cover_letter' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reqBody = await req.json();
    const resume = reqBody.resume;
    const rawJobDescription = reqBody.jobDescription;
    const tone = reqBody.tone || 'professional';

    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and truncate job description
    const jobDescription = sanitizeInputText(rawJobDescription, 15_000);

    if (JSON.stringify(resume).length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Job description too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTone = VALID_TONES.includes(tone) ? tone : 'professional';

    const toneDescriptions: Record<string, string> = {
      professional: 'formal, polished, and business-appropriate',
      enthusiastic: 'energetic, passionate, and showing genuine excitement',
      conversational: 'friendly, approachable, and natural-sounding',
    };

    const systemPrompt = `You are an expert cover letter writer. Write compelling cover letters that are tailored to the job, highlight relevant experience, are concise (300-400 words), and use the tone: ${toneDescriptions[validTone]}. Do not use generic phrases.

CRITICAL RULES:
- The letter header MUST include the candidate's actual name, email, and phone exactly as provided below. If any contact field is missing, omit that line entirely rather than using a placeholder.
- Do NOT use placeholder brackets like [Your Name] or [Company Name]. Use the actual values provided.
- Do NOT invent achievements, metrics, or experiences not present in the candidate's resume.`;

    const userPrompt = `Write a cover letter:

CANDIDATE:
Name: ${resume.contactInfo?.fullName || 'Candidate'}
Phone: ${resume.contactInfo?.phone || ''}
Email: ${resume.contactInfo?.email || ''}
LinkedIn: ${resume.contactInfo?.linkedin || ''}

Use these ACTUAL contact details. Do NOT use placeholder brackets.

Current Role: ${resume.experience?.[0]?.position || 'Professional'} at ${resume.experience?.[0]?.company || 'Previous Company'}
Summary: ${resume.summary || 'Experienced professional'}
Key Skills: ${safeSkillsString(resume.skills?.slice(0, 10)) || 'Various skills'}

Recent Experience:
${resume.experience?.slice(0, 2).map((e: any) => `- ${e.position} at ${e.company}\n  ${e.achievements?.slice(0, 2).join('; ') || e.description}`).join('\n') || 'Professional experience'}

Education: ${resume.education?.[0]?.degree || ''} in ${resume.education?.[0]?.field || ''} from ${resume.education?.[0]?.institution || ''}

JOB DESCRIPTION:
${jobDescription}

Write a ${validTone} cover letter with a professional header containing actual contact details.`;

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      userId: user.id,
    });

    const coverLetter = aiResponse.content;
    if (!coverLetter) throw new Error("No content in AI response");

    await recordUsage(user.id, 'cover_letter');

    return new Response(
      JSON.stringify({ coverLetter }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-cover-letter error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
