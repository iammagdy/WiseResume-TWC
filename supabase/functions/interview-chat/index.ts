import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, parseAIJSON } from "../_shared/aiClient.ts";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 10 * 1024;
const MAX_RESUME_SIZE = 100 * 1024;
const MAX_JOB_DESCRIPTION_SIZE = 50 * 1024;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
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

    const { messages, resumeData, jobDescription, endInterview, analyzeRole, userGeminiKey, quickPractice } = await req.json();

    // Input validation
    if (messages) {
      if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
        return new Response(
          JSON.stringify({ error: 'Invalid messages' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const msg of messages) {
        if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
          return new Response(
            JSON.stringify({ error: 'Message too large' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (resumeData && JSON.stringify(resumeData).length > MAX_RESUME_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Resume data too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (jobDescription && typeof jobDescription === 'string' && jobDescription.length > MAX_JOB_DESCRIPTION_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Job description too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resumeContext = resumeData
      ? `\nCANDIDATE RESUME:\nName: ${resumeData.contactInfo?.fullName || "Unknown"}\nSummary: ${resumeData.summary || "N/A"}\nSkills: ${(resumeData.skills || []).join(", ")}\nExperience: ${(resumeData.experience || []).map((e: any) => `${e.position} at ${e.company} (${e.startDate}-${e.endDate || "Present"}): ${e.description}. Achievements: ${(e.achievements || []).join("; ")}`).join("\n")}\nEducation: ${(resumeData.education || []).map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join(", ")}\n`
      : "";

    const jobContext = jobDescription ? `\nTARGET JOB DESCRIPTION:\n${jobDescription}\n` : "";

    // Role analysis mode
    if (analyzeRole && jobDescription) {
      const analyzePrompt = `You are Wise AI, the intelligent interview coach. Analyze the job description and resume.

${resumeContext}${jobContext}

Return JSON: {"title":"","keySkills":[""],"questionCategories":[""],"industryInsights":""}`;

      const aiResponse = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: analyzePrompt }],
        userGeminiKey,
      });

      const roleAnalysis = parseAIJSON(aiResponse.content || '{}') || {
        title: "Position",
        keySkills: ["Communication", "Problem Solving", "Teamwork"],
        questionCategories: ["Behavioral", "Technical", "Situational"],
        industryInsights: "Interviewers will focus on your practical experience."
      };

      return new Response(JSON.stringify({ reply: "Role analyzed", roleAnalysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = endInterview
      ? `You are Wise AI. The mock interview ended. Provide a brief summary:\n\n**Overall Assessment:** [1-2 sentences]\n\n**Strengths:**\n- [strength 1-3]\n\n**Areas to Improve:**\n- [area 1-2]\n\n**Score: [X]/10**\n\n**Tip:** [One actionable tip]\n\nBe encouraging but honest.`
      : `You are Wise AI, the intelligent interview coach.${quickPractice ? '\n\nQUICK PRACTICE: Ask EXACTLY 5 questions, then auto-summarize.\n' : ''} Ask ONE question at a time. After each answer, give brief feedback then ask the next question. Mix behavioral, technical, and situational. Be warm and professional.\n\nAfter each answer include:\n---SCORE---\n{"score": [1-10], "tip": "[tip]", "improved_answer": "[better answer]"}\n---END_SCORE---\n\n${resumeContext}${jobContext}`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      userGeminiKey,
    });

    const reply = aiResponse.content || "I couldn't generate a response. Let's try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("interview-chat error:", error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
