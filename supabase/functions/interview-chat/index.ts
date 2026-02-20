import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAIWithRetry, isAIError, parseAIJSON, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const safeSkillsString = (skills: any[] | undefined): string =>
  (skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean).join(', ');

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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 30, windowSeconds: 60, actionType: 'interview' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, resumeData, jobDescription, endInterview, analyzeRole, quickPractice } = await req.json();

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
      ? `\nCANDIDATE RESUME:\nName: ${resumeData.contactInfo?.fullName || "Unknown"}\nSummary: ${resumeData.summary || "N/A"}\nSkills: ${safeSkillsString(resumeData.skills)}\nExperience: ${(resumeData.experience || []).map((e: any) => `${e.position} at ${e.company} (${e.startDate}-${e.endDate || "Present"}): ${e.description}. Achievements: ${(e.achievements || []).join("; ")}`).join("\n")}\nEducation: ${(resumeData.education || []).map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`).join(", ")}\n`
      : "";

    const jobContext = jobDescription ? `\nTARGET JOB DESCRIPTION:\n${jobDescription}\n` : "";

    // Role analysis mode — use stronger model for one-time quality analysis
    if (analyzeRole && jobDescription) {
      const analyzePrompt = `You are Wise AI, the intelligent interview coach. Analyze the job description and resume to prepare a targeted interview strategy.

${resumeContext}${jobContext}

Return JSON with this exact structure: {"title":"exact job title","keySkills":["skill1","skill2","skill3","skill4","skill5"],"questionCategories":["category1","category2","category3"],"industryInsights":"2-3 sentences about what interviewers in this field specifically look for and common pitfalls to avoid"}`;

      const aiResponse = await callAIWithRetry({
        model: 'google/gemini-2.5-pro',
        messages: [{ role: 'user', content: analyzePrompt }],
        userId: user.id,
        maxTokens: 512,
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

    // --- Build system prompt ---
    const maxTokens = endInterview ? 1500 : 1024;

    const systemPrompt = endInterview
      ? `You are Wise AI, a professional interview coach. The mock interview has ended. Provide a structured performance summary:

**Overall Assessment:** [2-3 sentences evaluating the candidate's interview performance]

**Strengths:**
- [Specific strength with example from their answers]
- [Another strength]
- [Another strength if applicable]

**Areas to Improve:**
- [Specific area with actionable advice]
- [Another area with actionable advice]

**Score: [X]/10**

**Next Steps:** [2-3 specific, actionable things to practice before their real interview]

Be encouraging but honest. Reference specific answers they gave when possible.`
      : `You are Wise AI, a professional and warm interview coach conducting a realistic mock interview.${resumeContext}${jobContext}

INTERVIEW RULES:
1. Ask ONE question at a time. Wait for the candidate's answer before proceeding.
2. After each answer, give brief feedback (2-3 sentences max) highlighting what was good and one specific improvement, then ask the next question.
3. Mix question types: behavioral (use STAR method prompts), technical, and situational.
4. Progress difficulty: start with an easy warmup question, then gradually increase complexity.
5. For behavioral questions, if the candidate's answer lacks structure, gently guide them to use the STAR method (Situation, Task, Action, Result).
6. Keep your responses concise — no more than 150 words per turn.
${quickPractice ? '7. QUICK PRACTICE MODE: Ask exactly 5 questions total. After the 5th answer, provide your summary automatically without being asked.\n' : ''}
After EVERY candidate answer, include this scoring block at the end of your response:
---SCORE---
{"score": [1-10], "tip": "[one specific actionable tip]", "improved_answer": "[a stronger version of their answer in 2-3 sentences]"}
---END_SCORE---`;

    const aiResponse = await callAIWithRetry({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      userId: user.id,
      maxTokens,
    });

    const reply = aiResponse.content || "I couldn't generate a response. Let's try again.";

    await recordUsage(user.id, 'interview');

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("interview-chat error:", error);
    const userError = toUserError(error);
    return new Response(
      JSON.stringify({ error: userError.message }),
      { status: userError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
