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

    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching job posting from:", url);

    // Fetch the page content
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }

    const html = await pageResponse.text();
    
    // Extract text content from HTML (basic extraction)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20000); // Increased limit for better extraction

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Using ENHANCED AI to extract comprehensive job intelligence...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: `You are an expert job market analyst. Extract COMPREHENSIVE job posting information including hidden signals about company culture, realistic salary expectations, and requirement priorities.

Return ONLY valid JSON with no markdown or code blocks.`
          },
          { 
            role: "user", 
            content: `Extract the job posting details from this page content:

${textContent}

Return JSON with this comprehensive format:
{
  "title": "<job title>",
  "company": "<company name>",
  "description": "<full job description including ALL requirements, responsibilities, qualifications - be very comprehensive>",
  "experienceLevel": "<entry | mid | senior | executive - based on years required and responsibilities>",
  "salaryRange": {
    "min": <number or null if not found>,
    "max": <number or null if not found>,
    "currency": "<USD, EUR, etc.>"
  },
  "workMode": "<remote | hybrid | onsite | unknown>",
  "mustHaveSkills": ["<required/must-have skills>"],
  "niceToHaveSkills": ["<preferred/nice-to-have skills>"],
  "yearsExperience": "<extracted years requirement like '3-5 years' or null>",
  "companyCultureSignals": ["<culture indicators from language like 'fast-paced', 'collaborative', 'startup', 'enterprise'>"],
  "benefits": ["<listed benefits if any>"],
  "applicationDeadline": "<deadline if mentioned or null>",
  "redFlags": ["<any concerning patterns like unrealistic requirements for level, many required skills, etc.>"]
}

If you can't find certain fields, make reasonable guesses based on context. The description should be detailed and include all requirements and qualifications mentioned.`
          },
        ],
        temperature: 0.2,
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
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse job posting" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure all fields have defaults
    result = {
      ...result,
      title: result.title || 'Position',
      company: result.company || 'Company',
      description: result.description || '',
      experienceLevel: result.experienceLevel || 'mid',
      salaryRange: result.salaryRange || null,
      workMode: result.workMode || 'unknown',
      mustHaveSkills: result.mustHaveSkills || [],
      niceToHaveSkills: result.niceToHaveSkills || [],
      yearsExperience: result.yearsExperience || null,
      companyCultureSignals: result.companyCultureSignals || [],
      benefits: result.benefits || [],
      applicationDeadline: result.applicationDeadline || null,
      redFlags: result.redFlags || [],
    };

    console.log("Successfully parsed job posting with enhanced intelligence:", result.title);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-job-url error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
