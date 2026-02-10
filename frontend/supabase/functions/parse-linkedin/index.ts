import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============= SECURITY: Input validation limits =============
const MAX_PROFILE_TEXT_SIZE = 200 * 1024; // 200KB for LinkedIn profiles (they can be long)

interface LinkedInData {
  summary: string | null;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    description: string;
    current: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    description?: string;
  }>;
  skills: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { profileText, userGeminiKey } = await req.json();

    // ============= SECURITY: Input validation =============
    if (!profileText || typeof profileText !== "string") {
      return new Response(
        JSON.stringify({ error: "Profile text is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profileText.length > MAX_PROFILE_TEXT_SIZE) {
      return new Response(
        JSON.stringify({ error: `Profile text is too large. Maximum size is ${MAX_PROFILE_TEXT_SIZE / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect URL-only input to prevent AI hallucination
    const trimmedText = profileText.trim();
    const isUrlOnly = /^https?:\/\/(www\.)?linkedin\.com/i.test(trimmedText) && 
                      trimmedText.split('\n').length <= 3 && 
                      trimmedText.length < 500;

    if (isUrlOnly) {
      return new Response(
        JSON.stringify({ 
          error: "Please paste the full profile content, not just the URL. Go to your LinkedIn profile, select all (Ctrl+A), copy (Ctrl+C), and paste the complete text." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log(`parse-linkedin: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    const systemPrompt = `You are an expert at extracting structured resume data from LinkedIn profile text.

IMPORTANT RULES:
- If the input is ONLY a URL (like "https://linkedin.com/in/username"), return EMPTY arrays and null summary. Do NOT make up or guess information.
- Only extract data that is explicitly present in the provided text.
- Never fabricate or hallucinate data.

Your task is to parse the provided LinkedIn profile content and extract the following sections:

1. **Summary/About**: The profile summary or about section
2. **Experience**: Work history with job titles, companies, dates, locations, and descriptions
3. **Education**: Educational background with institutions, degrees, fields of study, and dates
4. **Skills**: List of professional skills

Be thorough and extract as much relevant information as possible. For dates, use formats like "Jan 2020" or "2020". 
If a position is current, mark it as such. Clean up any formatting issues in the text.`;

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
          { role: "user", content: `Please extract structured resume data from this LinkedIn profile:\n\n${profileText}` },
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
                  summary: {
                    type: "string",
                    description: "The about/summary section of the profile",
                  },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Job title" },
                        company: { type: "string", description: "Company name" },
                        location: { type: "string", description: "Job location" },
                        startDate: { type: "string", description: "Start date (e.g., Jan 2020)" },
                        endDate: { type: "string", description: "End date or 'Present'" },
                        description: { type: "string", description: "Job description and achievements" },
                        current: { type: "boolean", description: "Is this the current position" },
                      },
                      required: ["title", "company", "startDate", "endDate", "description", "current"],
                    },
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        institution: { type: "string", description: "School/University name" },
                        degree: { type: "string", description: "Degree type (e.g., Bachelor's, Master's)" },
                        field: { type: "string", description: "Field of study" },
                        startYear: { type: "string", description: "Start year" },
                        endYear: { type: "string", description: "End year or expected graduation" },
                        description: { type: "string", description: "Additional details" },
                      },
                      required: ["institution", "degree"],
                    },
                  },
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of professional skills",
                  },
                },
                required: ["summary", "experience", "education", "skills"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_linkedin_data" } },
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
          : "Rate limit exceeded. Please try again in a moment.";
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse LinkedIn profile");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const extractedData: LinkedInData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-linkedin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
