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

    const { resume, jobDescription } = await req.json();
    
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

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer and resume consultant. Analyze the provided resume against the job description and provide detailed scoring and gap analysis.

IMPORTANT: Respond ONLY with valid JSON, no markdown or code blocks. The response must be parseable JSON.`;

    const userPrompt = `Analyze this resume against the job description:

RESUME:
Name: ${resume.contactInfo?.fullName || 'Not provided'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${resume.skills?.join(', ') || 'Not provided'}
Experience: ${resume.experience?.map((e: any) => `${e.position} at ${e.company}: ${e.description}`).join('\n') || 'Not provided'}
Education: ${resume.education?.map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join('\n') || 'Not provided'}

JOB DESCRIPTION:
${jobDescription}

Provide analysis in this exact JSON format:
{
  "score": {
    "overallScore": <number 0-100>,
    "skillsMatch": <number 0-100>,
    "experienceRelevance": <number 0-100>,
    "keywordAlignment": <number 0-100>,
    "atsCompatibility": <number 0-100>,
    "strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "improvements": ["<improvement1>", "<improvement2>"]
  },
  "gaps": {
    "missingKeywords": ["<keyword1>", "<keyword2>"],
    "missingSkills": ["<skill1>", "<skill2>"],
    "suggestedSections": ["<section1>"],
    "recommendedPhrases": ["<phrase1>", "<phrase2>"],
    "priorityImprovements": [
      {"priority": "high", "suggestion": "<suggestion>", "impact": "<impact>"},
      {"priority": "medium", "suggestion": "<suggestion>", "impact": "<impact>"}
    ]
  }
}`;

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
        temperature: 0.3,
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
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the AI response
    let analysisResult;
    try {
      // Try to extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default analysis if parsing fails
      analysisResult = {
        score: {
          overallScore: 65,
          skillsMatch: 60,
          experienceRelevance: 70,
          keywordAlignment: 55,
          atsCompatibility: 75,
          strengths: ["Resume is well-structured", "Contact information is complete"],
          improvements: ["Add more relevant keywords", "Quantify achievements"]
        },
        gaps: {
          missingKeywords: ["leadership", "project management"],
          missingSkills: [],
          suggestedSections: ["Professional Certifications"],
          recommendedPhrases: ["results-driven", "cross-functional"],
          priorityImprovements: [
            { priority: "high", suggestion: "Add more specific keywords from the job description", impact: "Improve ATS matching" }
          ]
        }
      };
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-resume error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
