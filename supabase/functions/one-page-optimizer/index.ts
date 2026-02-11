import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  skills: string[];
  certifications?: {
    id: string;
    name: string;
    issuer: string;
    date: string;
  }[];
}

interface OnePageRequest {
  resume: ResumeData;
  targetRole?: string;
  yearsOfExperience?: number;
  preserveRecent?: number;
  userGeminiKey?: string;
}

interface ContentReduction {
  section: string;
  original: string;
  condensed: string;
  wordsRemoved: number;
  strategy: string;
}

interface OnePageResult {
  currentEstimatedPages: number;
  optimizedEstimatedPages: number;
  reductions: ContentReduction[];
  removedItems: {
    section: string;
    item: string;
    reason: string;
  }[];
  condensedSummary?: string;
  condensedExperience: {
    id: string;
    description: string;
    achievements: string[];
  }[];
  layoutSuggestions: string[];
  overallStrategy: string;
}

const MAX_PAYLOAD_SIZE = 100000;

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
  charCount += resume.skills?.join(', ').length || 0;
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
      console.error('Auth error:', authError?.message);
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

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    console.log(`one-page-optimizer: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    const currentPages = estimatePageCount(resume);
    
    // If already one page, provide minor optimization suggestions
    if (currentPages <= 1) {
      return new Response(
        JSON.stringify({
          success: true,
          currentEstimatedPages: 1,
          optimizedEstimatedPages: 1,
          reductions: [],
          removedItems: [],
          condensedExperience: resume.experience.map(e => ({
            id: e.id,
            description: e.description,
            achievements: e.achievements,
          })),
          layoutSuggestions: [
            'Your resume is already one page! Consider adjusting margins or font size for better readability.',
          ],
          overallStrategy: 'Your resume fits on one page. No major reductions needed.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeJson = JSON.stringify(resume, null, 2);

    const prompt = `You are a resume optimization expert specializing in condensing resumes to one page without losing impact. Your goal is to strategically reduce content while preserving the most impressive and relevant information.

Current resume (estimated ${currentPages} pages):
${resumeJson}

${targetRole ? `Target role: ${targetRole}` : ''}
${yearsOfExperience ? `Years of experience: ${yearsOfExperience}` : ''}
Preserve the most recent ${preserveRecent} jobs in full detail.

Apply these condensation strategies:
1. SUMMARY: Reduce to 2-3 impactful sentences max
2. EXPERIENCE: 
   - Keep ${preserveRecent} most recent roles detailed
   - For older roles: combine into 1-2 achievement bullets each
   - Remove redundant achievements across roles
   - Prioritize quantified results
3. EDUCATION: Keep essential info only (degree, school, year)
4. SKILLS: Remove skills that are implied or outdated
5. Remove any jobs older than 10-15 years unless highly relevant

Return a JSON object with this structure:
{
  "currentEstimatedPages": ${currentPages},
  "optimizedEstimatedPages": 1,
  "reductions": [
    {
      "section": "<summary|experience|education|skills>",
      "original": "<original text>",
      "condensed": "<condensed version>",
      "wordsRemoved": <number>,
      "strategy": "<explanation of condensation approach>"
    }
  ],
  "removedItems": [
    {
      "section": "<section name>",
      "item": "<what was removed>",
      "reason": "<why it was safe to remove>"
    }
  ],
  "condensedSummary": "<new 2-3 sentence summary if summary was changed>",
  "condensedExperience": [
    {
      "id": "<experience id from original>",
      "description": "<condensed description>",
      "achievements": ["<condensed achievement bullets>"]
    }
  ],
  "layoutSuggestions": [
    "<specific layout/formatting suggestions to save space>"
  ],
  "overallStrategy": "<2-3 sentence explanation of the optimization approach>"
}

Be aggressive but smart - the goal is exactly one page while maximizing impact.`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('One-page optimizer API error:', errorText);
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your AI settings.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        const errorMsg = useGeminiDirect
          ? 'Rate limit exceeded. Your Gemini key may have hit its quota.'
          : 'Too many requests. Please try again later.';
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: errorMsg }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('One-page optimization failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: OnePageResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonString.trim());
    } catch (e) {
      console.error('Failed to parse one-page optimizer response:', e, 'Content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('One-page optimization completed successfully');

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('One-page optimizer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
