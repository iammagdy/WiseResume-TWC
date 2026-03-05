import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError, toUserError } from "../_shared/aiClient.ts";
import { checkRateLimit, recordUsage } from "../_shared/rateLimiter.ts";

const MAX_PROFILE_TEXT_SIZE = 200 * 1024;

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

    const rateCheck = await checkRateLimit(user.id, { maxRequests: 10, windowSeconds: 60, actionType: 'parse_linkedin' });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSeconds}s.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { profileText } = await req.json();

    if (!profileText || typeof profileText !== "string") {
      return new Response(
        JSON.stringify({ error: "Profile text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profileText.length > MAX_PROFILE_TEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Profile text too large. Maximum ${MAX_PROFILE_TEXT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedText = profileText.trim();
    const isUrlOnly = /^https?:\/\/(www\.)?linkedin\.com/i.test(trimmedText) && 
                      trimmedText.split('\n').length <= 3 && 
                      trimmedText.length < 500;

    if (isUrlOnly) {
      return new Response(
        JSON.stringify({ error: "Please paste the full profile content, not just the URL." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert at extracting structured resume data from LinkedIn profile text.

IMPORTANT: If the input is ONLY a URL, return EMPTY arrays and null summary. Do NOT make up data.
Only extract data explicitly present in the text. Never fabricate data.

Extract: Summary/About, Experience, Education, Skills. For dates, use "Jan 2020" or "2020". Mark current positions.`;

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract structured data from this LinkedIn profile:\n\n${profileText}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_linkedin_data",
            description: "Extract structured data from LinkedIn profile text",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "About/summary section" },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company: { type: "string" },
                      location: { type: "string" },
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      description: { type: "string" },
                      current: { type: "boolean" },
                    },
                    required: ["title", "company", "startDate", "endDate", "description", "current"],
                  },
                },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      institution: { type: "string" },
                      degree: { type: "string" },
                      field: { type: "string" },
                      startYear: { type: "string" },
                      endYear: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["institution", "degree"],
                  },
                },
                skills: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "experience", "education", "skills"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "extract_linkedin_data" } },
      userId: user.id,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    await recordUsage(user.id, 'parse_linkedin', { provider: aiResponse.providerUsed || 'unknown' });

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-linkedin error:", error);
    const { status, error: code, message } = toUserError(error);
    return new Response(
      JSON.stringify({ error: code, message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
