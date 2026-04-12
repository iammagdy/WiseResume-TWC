import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, getUserKeyFromDB } from "../_shared/aiClient.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sizeError = checkPayloadSize(req, 200 * 1024);
  if (sizeError) return sizeError;

  try {
    const { username, question, conversationHistory = [] } = await req.json();

    if (!username || !question) {
      return new Response(JSON.stringify({ error: "Missing username or question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

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

    if (!profile || !resume) {
      return new Response(JSON.stringify({ error: "Incomplete portfolio data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the portfolio owner's user_id from their profile
    const { data: ownerRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (!ownerRow?.user_id) {
      return new Response(JSON.stringify({ error: "Portfolio owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the owner's BYOK Gemini key
    const ownerKey = await getUserKeyFromDB(ownerRow.user_id, 'gemini');
    const isFallback = !ownerKey;

    // IP-based rate limiting for public endpoint (20 req/60s per IP)
    const callerIp = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown';
    if (callerIp === 'unknown') {
      console.warn('[ask-portfolio] Could not determine caller IP for rate limiting');
    } else {
      const { allowed: ipAllowed } = await checkRateLimit(callerIp, { actionType: 'ask_portfolio', maxRequests: 20, windowSeconds: 60 });
      if (!ipAllowed) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Server-side rate limit: max 50 questions per username per day
    const today = new Date().toISOString().slice(0, 10);
    const { count: dailyCount } = await supabase
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ownerRow.user_id)
      .eq('action_type', 'chat')
      .gte('created_at', `${today}T00:00:00Z`);

    if ((dailyCount ?? 0) >= 50) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.slice(-6),
      { role: "user" as const, content: question },
    ];

    const aiResponse = await callAI({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.3,
      maxTokens: 300,
      ...(ownerKey ? { userGeminiKey: ownerKey } : {}),
      userId: ownerRow.user_id,
    });

    const answer = aiResponse.content || "I couldn't generate a response. Please try again.";

    // Record IP-based usage after successful response
    if (callerIp !== 'unknown') {
      await recordUsage(callerIp, 'ask_portfolio');
    }

    return new Response(JSON.stringify({ answer, isFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-portfolio error:", e);

    if (e && typeof e === 'object' && 'status' in e) {
      const aiErr = e as { status: number; message: string };
      if (aiErr.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
