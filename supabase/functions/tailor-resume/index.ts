import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const systemPrompt = `You are an expert resume writer and career consultant. Your job is to tailor resumes to specific job descriptions while maintaining authenticity and truthfulness.

IMPORTANT RULES:
1. NEVER fabricate experience or skills the candidate doesn't have
2. Rewrite existing content to better match job keywords and requirements
3. Emphasize relevant experience and skills that align with the job
4. Use industry-specific terminology from the job description
5. Optimize bullet points with action verbs and quantifiable achievements
6. Keep the resume ATS-friendly with proper formatting
7. Maintain professional tone throughout

Respond ONLY with valid JSON, no markdown or code blocks.`;

    const userPrompt = `Tailor this resume for the following job:

CURRENT RESUME:
Name: ${resume.contactInfo?.fullName || 'Not provided'}
Email: ${resume.contactInfo?.email || ''}
Phone: ${resume.contactInfo?.phone || ''}
Location: ${resume.contactInfo?.location || ''}
LinkedIn: ${resume.contactInfo?.linkedin || ''}
Portfolio: ${resume.contactInfo?.portfolio || ''}

Summary: ${resume.summary || 'Not provided'}

Skills: ${resume.skills?.join(', ') || 'Not provided'}

Experience:
${resume.experience?.map((e: any) => `
- ${e.position} at ${e.company} (${e.startDate} - ${e.current ? 'Present' : e.endDate})
  ${e.description}
  Achievements: ${e.achievements?.join('; ') || 'None listed'}
`).join('\n') || 'Not provided'}

Education:
${resume.education?.map((e: any) => `
- ${e.degree} in ${e.field} from ${e.institution} (${e.startDate} - ${e.endDate})${e.gpa ? ` GPA: ${e.gpa}` : ''}
`).join('\n') || 'Not provided'}

JOB DESCRIPTION:
${jobDescription}

Return the tailored resume in this exact JSON format:
{
  "summary": "<rewritten professional summary optimized for this role>",
  "skills": ["<skill1>", "<skill2>", "..."],
  "experience": [
    {
      "id": "<keep original id>",
      "company": "<company name>",
      "position": "<position title - can be slightly adjusted to match job terminology>",
      "startDate": "<keep original>",
      "endDate": "<keep original>",
      "current": <keep original boolean>,
      "description": "<rewritten description emphasizing relevant aspects>",
      "achievements": ["<rewritten achievement 1>", "<rewritten achievement 2>"]
    }
  ],
  "education": [
    {
      "id": "<keep original id>",
      "institution": "<institution>",
      "degree": "<degree>",
      "field": "<field - can highlight relevant specializations>",
      "startDate": "<keep original>",
      "endDate": "<keep original>",
      "gpa": "<keep if exists>"
    }
  ],
  "keyChanges": [
    "<brief description of change 1>",
    "<brief description of change 2>",
    "<brief description of change 3>"
  ]
}`;

    console.log("Calling AI gateway for resume tailoring...");

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
        temperature: 0.4,
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

    console.log("AI response received, parsing...");

    // Parse the JSON from the AI response
    let tailoredResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tailoredResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully tailored resume");

    return new Response(
      JSON.stringify(tailoredResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("tailor-resume error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
