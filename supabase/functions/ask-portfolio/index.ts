import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { callAI } from "../_shared/aiClient.ts";
import { selectProviderForTool } from "../_shared/modelRouter.ts";
const __ROUTE = selectProviderForTool('ask-portfolio');
import { getServiceClient } from "../_shared/dbClient.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkPayloadSize } from "../_shared/requestUtils.ts";
import { checkIpRateLimit } from "../_shared/rateLimiter.ts";
import { logger } from "../_shared/logger.ts";
import { verifySessionToken } from "../_shared/portfolioSession.ts";

import { wrapHandler } from '../_shared/fnLogger.ts';
const log = logger('ask-portfolio');

// Public endpoint (no auth). Spend controls: HMAC session token, BYOK-only AI
// key (no platform fallback), and atomic per-session/daily quota RPC.

serve(wrapHandler("ask-portfolio", async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sizeError = checkPayloadSize(req, 200 * 1024);
  if (sizeError) return sizeError;

  // Per-IP rate limit (10/min, 100/day) — runs before any DB / AI work so
  // a hot loop from one IP can't run up the BYOK owner's bill.
  const clientIp =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (clientIp) {
    const minuteLimit = await checkIpRateLimit(clientIp, "ask-portfolio:minute", 10, 60);
    if (!minuteLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(minuteLimit.retryAfterSeconds),
        },
      });
    }
    const dailyLimit = await checkIpRateLimit(clientIp, "ask-portfolio:day", 100, 86400);
    if (!dailyLimit.allowed) {
      return new Response(JSON.stringify({ error: "Daily rate limit exceeded. Please try again tomorrow." }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(dailyLimit.retryAfterSeconds),
        },
      });
    }
  }

  try {
    const body = await req.json();
    const { username, question, conversationHistory = [], sessionToken } = body;

    if (!username || !question) {
      return new Response(JSON.stringify({ error: "Missing username or question" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-issued session token is required. This replaces IP-header-based identity
    // with a non-bypassable server-signed credential.
    if (!sessionToken || typeof sessionToken !== 'string') {
      return new Response(JSON.stringify({ error: "A valid session token is required. Please reload the page." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await verifySessionToken(sessionToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Session expired or invalid. Please reload the page." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The token must be for the requested portfolio (prevents token reuse across portfolios)
    if (session.portfolioUsername !== username.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Session token does not match the requested portfolio." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // BYOK enforcement — look up the portfolio owner's preferred AI provider from
    // user_preferences. If none is set (or it's 'wiseresume' which uses platform
    // credits), fall back to checking any key in user_api_keys. This endpoint is
    // BYOK-only: no platform-key fallback is allowed.
    const { data: prefRow } = await supabase
      .from('user_preferences')
      .select('ai_provider')
      .eq('user_id', ownerRow.user_id)
      .maybeSingle();

    let byokProvider: string | null = prefRow?.ai_provider ?? null;

    // 'wiseresume' means the owner uses platform credits — not valid here.
    if (!byokProvider || byokProvider === 'wiseresume') {
      const { data: anyKey } = await supabase
        .from('user_api_keys')
        .select('provider')
        .eq('user_id', ownerRow.user_id)
        .limit(1)
        .maybeSingle();
      byokProvider = anyKey?.provider ?? null;
    }

    // Allowlist of providers that callAI can actually route to via BYOK.
    // Any other value (including unknown strings from user_api_keys) is treated
    // as "no valid BYOK configured" and returns a 503.
    const SUPPORTED_BYOK_PROVIDERS = new Set([
      'gemini', 'ollama', 'openrouter', 'anthropic',
      'openai', 'groq', 'mistral', 'xai', 'cohere',
    ]);

    if (!byokProvider || !SUPPORTED_BYOK_PROVIDERS.has(byokProvider)) {
      return new Response(JSON.stringify({
        error: "The AI assistant for this portfolio requires the owner to configure their API key.",
        isFallback: true,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically validate per-session (20/session) and per-portfolio-daily (50/day)
    // quotas and record this usage in a single DB transaction — called BEFORE the
    // AI call so any database failure causes a hard 503 (fail-closed) rather than
    // silently treating the limit as not reached.
    const today = new Date().toISOString().slice(0, 10);
    const { data: quotaRows, error: quotaError } = await supabase.rpc(
      'atomic_portfolio_chat_quota',
      {
        p_user_id: ownerRow.user_id,
        p_session_id: session.sessionId,
        p_today: today,
        p_session_limit: 20,
        p_daily_limit: 50,
      }
    );

    if (quotaError) {
      log.error('Quota RPC failed — blocking request (fail-closed)', quotaError);
      return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again in a moment." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quotaResult = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quotaResult?.allowed) {
      return new Response(JSON.stringify({
        error: quotaResult?.reason ?? "Rate limit exceeded. Please try again later.",
      }), {
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
      model: __ROUTE.model, wiseresumeSubProvider: __ROUTE.provider,
      messages,
      temperature: 0.3,
      maxTokens: 300,
      userId: ownerRow.user_id,
      preferredProvider: byokProvider,
    });

    const answer = aiResponse.content || "I couldn't generate a response. Please try again.";

    // Usage was already atomically recorded by atomic_portfolio_chat_quota RPC
    // before the AI call. No additional insert needed here.

    return new Response(JSON.stringify({ answer, isFallback: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.error('Unhandled error', e);

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
}));
