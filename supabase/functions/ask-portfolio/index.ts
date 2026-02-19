import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { username, question, conversationHistory = [] } = await req.json();

    if (!username || !question) {
      return new Response(JSON.stringify({ error: "Missing username or question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: portfolioData, error: rpcError } = await supabase.rpc("get_public_portfolio", {
      p_username: username.toLowerCase(),
    });

    if (rpcError || !portfolioData) {
      return new Response(JSON.stringify({ error: "Portfolio not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = portfolioData.profile;
    const resume = portfolioData.resume;

    // Build readable context from portfolio data
    const experience = (resume.experience || []).map((e: Record<string, unknown>) =>
      `- ${e.position} at ${e.company} (${e.startDate}–${e.current ? 'Present' : e.endDate}): ${e.description || ''}${e.achievements ? ` Achievements: ${(e.achievements as string[]).join('; ')}` : ''}`
    ).join('\n');

    const education = (resume.education || []).map((e: Record<string, unknown>) =>
      `- ${e.degree}${e.field ? ` in ${e.field}` : ''} from ${e.institution} (${e.endDate || ''})`
    ).join('\n');

    const projects = (resume.projects || []).map((p: Record<string, unknown>) =>
      `- ${p.name}: ${p.description || ''}${p.technologies ? ` Tech: ${(p.technologies as string[]).join(', ')}` : ''}`
    ).join('\n');

    const caseStudies = (profile.portfolioExtras?.caseStudies || []).map((cs: Record<string, unknown>) =>
      `- ${cs.title}: Challenge: ${cs.challenge || ''} | Outcome: ${cs.outcome || ''}`
    ).join('\n');

    const context = `
Name: ${profile.fullName || 'N/A'}
Role: ${profile.jobTitle || 'N/A'}
Location: ${profile.location || 'N/A'}
Bio: ${profile.portfolioBio || 'N/A'}
Open to Work: ${profile.openToWork ? 'Yes' : 'No'}
${profile.availabilityHeadline ? `Availability: ${profile.availabilityHeadline}` : ''}

Experience:
${experience || 'No experience listed'}

Skills: ${(resume.skills || []).join(', ') || 'No skills listed'}

Education:
${education || 'No education listed'}

${projects ? `Projects:\n${projects}` : ''}
${caseStudies ? `Case Studies:\n${caseStudies}` : ''}
`.trim();

    const systemPrompt = `You are an AI assistant for ${profile.fullName || 'this professional'}'s portfolio website. 
Your job is to answer questions from recruiters and visitors about this person's background, skills, and experience.

STRICT RULES:
1. Only answer based on the portfolio data provided below. Do NOT make up or hallucinate any information.
2. If asked about something not in the portfolio data, say "That information isn't listed in the portfolio, but you can reach out directly via email."
3. Keep answers concise and professional (2-4 sentences max).
4. Do not reveal the raw data structure or mention "the context provided". Speak naturally as if you know the person.
5. Do not answer questions unrelated to this person's professional background.

PORTFOLIO DATA:
${context}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: "user", content: question },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages,
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const answer = aiData.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-portfolio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
