import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";

interface ResumeData {
  contactInfo: { fullName: string; email: string; phone: string; location: string; linkedin?: string; portfolio?: string };
  summary: string;
  experience: { id: string; company: string; position: string; startDate: string; endDate: string; current: boolean; description: string; achievements: string[] }[];
  education: { id: string; institution: string; degree: string; field: string; startDate: string; endDate: string; gpa?: string }[];
  skills: string[];
  certifications?: { id: string; name: string; issuer: string; date: string }[];
}

interface OnePageRequest {
  resume: ResumeData;
  targetRole?: string;
  yearsOfExperience?: number;
  preserveRecent?: number;
  userGeminiKey?: string;
}

const MAX_PAYLOAD_SIZE = 100000;

const safeSkillsString = (skills: any[] | undefined | null): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

function estimatePageCount(resume: ResumeData): number {
  let charCount = 0;
  charCount += Object.values(resume.contactInfo).filter(Boolean).join(' ').length;
  charCount += resume.summary?.length || 0;
  resume.experience?.forEach(exp => {
    charCount += exp.position.length + exp.company.length + 50;
    charCount += exp.description?.length || 0;
    exp.achievements?.forEach(a => charCount += a.length + 5);
  });
  resume.education?.forEach(edu => {
    charCount += edu.degree.length + edu.field.length + edu.institution.length + 50;
  });
  charCount += safeSkillsString(resume.skills).length;
  resume.certifications?.forEach(cert => {
    charCount += cert.name.length + cert.issuer.length + 30;
  });
  return Math.ceil(charCount / 3000);
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

    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: `Payload must be under ${MAX_PAYLOAD_SIZE} characters` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resume, targetRole, yearsOfExperience, preserveRecent = 2, userGeminiKey }: OnePageRequest = JSON.parse(bodyText);

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentPages = estimatePageCount(resume);
    
    if (currentPages <= 1) {
      return new Response(
        JSON.stringify({
          success: true,
          currentEstimatedPages: 1,
          optimizedEstimatedPages: 1,
          reductions: [],
          removedItems: [],
          condensedExperience: resume.experience.map(e => ({ id: e.id, description: e.description, achievements: e.achievements })),
          layoutSuggestions: ['Your resume is already one page!'],
          overallStrategy: 'Your resume fits on one page. No major reductions needed.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeJson = JSON.stringify(resume, null, 2);

    const prompt = `You are a resume optimization expert. Condense this ${currentPages}-page resume to one page.

${resumeJson}

${targetRole ? `Target role: ${targetRole}` : ''}
${yearsOfExperience ? `Years of experience: ${yearsOfExperience}` : ''}
Preserve the most recent ${preserveRecent} jobs in full detail.

Return a JSON object with: currentEstimatedPages, optimizedEstimatedPages, reductions, removedItems, condensedSummary, condensedExperience, layoutSuggestions, overallStrategy.`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      userGeminiKey,
    });

    const result = parseAIJSON(aiResponse.content || '{}');

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('One-page optimizer error:', error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
