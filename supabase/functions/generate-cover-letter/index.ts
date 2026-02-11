import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ============= SECURITY: Input validation limits =============
const MAX_RESUME_SIZE = 100 * 1024; // 100KB
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024; // 50KB
const VALID_TONES = ['professional', 'enthusiastic', 'conversational'];

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

    const { resume, jobDescription, tone = 'professional', userGeminiKey } = await req.json();
    
    // ============= SECURITY: Input validation =============
    if (!resume || typeof resume !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Resume is required and must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobDescription || typeof jobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Job description is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeStr = JSON.stringify(resume);
    if (resumeStr.length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: `Resume data is too large. Maximum size is ${MAX_RESUME_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: `Job description is too large. Maximum size is ${MAX_JOB_DESCRIPTION_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tone
    const validTone = VALID_TONES.includes(tone) ? tone : 'professional';

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    console.log(`generate-cover-letter: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}, tone: ${validTone}`);

    const toneDescriptions: Record<string, string> = {
      professional: 'formal, polished, and business-appropriate',
      enthusiastic: 'energetic, passionate, and showing genuine excitement',
      conversational: 'friendly, approachable, and natural-sounding',
    };

    const systemPrompt = `You are an expert cover letter writer. Write compelling cover letters that:
1. Are tailored specifically to the job and company
2. Highlight relevant experience and skills from the resume
3. Show genuine interest in the role
4. Are concise (300-400 words)
5. Use the specified tone: ${toneDescriptions[validTone] || toneDescriptions.professional}

Do not use generic phrases like "I am writing to apply for". Be specific and impactful.`;

    const userPrompt = `Write a cover letter for this job application:

CANDIDATE RESUME:
Name: ${resume.contactInfo?.fullName || 'Candidate'}
Current Role: ${resume.experience?.[0]?.position || 'Professional'} at ${resume.experience?.[0]?.company || 'Previous Company'}

Summary: ${resume.summary || 'Experienced professional'}

Key Skills: ${resume.skills?.slice(0, 10).join(', ') || 'Various technical and soft skills'}

Recent Experience:
${resume.experience?.slice(0, 2).map((e: any) => `
- ${e.position} at ${e.company}
  ${e.achievements?.slice(0, 2).join('; ') || e.description}
`).join('\n') || 'Professional experience'}

Education: ${resume.education?.[0]?.degree || ''} in ${resume.education?.[0]?.field || ''} from ${resume.education?.[0]?.institution || ''}

JOB DESCRIPTION:
${jobDescription}

Write a ${validTone} cover letter. Start directly with an engaging opening paragraph. Include 2-3 body paragraphs highlighting relevant experience. End with a confident call to action.`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your AI settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        const errorMsg = useGeminiDirect
          ? "Rate limit exceeded. Your Gemini key may have hit its quota."
          : "Rate limits exceeded, please try again later.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please check your Wise AI subscription." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const coverLetter = aiResponse.choices?.[0]?.message?.content;

    if (!coverLetter) {
      throw new Error("No content in AI response");
    }

    console.log("Successfully generated cover letter");

    return new Response(
      JSON.stringify({ coverLetter }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-cover-letter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
