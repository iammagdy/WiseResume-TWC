import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
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
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { resume, jobDescription, tone = 'professional' } = await req.json();
    
    if (!resume || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Resume and job description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
5. Use the specified tone: ${toneDescriptions[tone] || toneDescriptions.professional}

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

Write a ${tone} cover letter. Start directly with an engaging opening paragraph. Include 2-3 body paragraphs highlighting relevant experience. End with a confident call to action.`;

    console.log("Generating cover letter with tone:", tone);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
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
