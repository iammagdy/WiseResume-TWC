const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ResumeData {
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
  skills: string[];
}

interface LinkedInOptimizeRequest {
  resume: ResumeData;
  targetRole?: string;
  region?: 'global' | 'gcc' | 'emea' | 'apac' | 'americas';
  userGeminiKey?: string;
}

interface LinkedInOptimizeResult {
  headlines: string[];
  aboutSections: {
    short: string;
    medium: string;
    long: string;
  };
  experienceRewrites: {
    original: string;
    linkedin: string;
    position: string;
    company: string;
  }[];
  suggestedSkills: string[];
  keywords: string[];
  tips: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resume, targetRole, region = 'global', userGeminiKey }: LinkedInOptimizeRequest = await req.json();

    if (!resume) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which AI gateway to use
    const useGeminiDirect = !!userGeminiKey;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!useGeminiDirect && !LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = useGeminiDirect
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
    const modelName = useGeminiDirect ? "gemini-2.0-flash" : "google/gemini-3-flash-preview";

    console.log(`optimize-for-linkedin: Using ${useGeminiDirect ? 'Gemini Direct' : 'Lovable Gateway'}`);

    const regionContext = {
      global: 'Use internationally recognized terminology and avoid region-specific idioms.',
      gcc: 'Consider Gulf Cooperation Council business culture. Emphasize stability, respect for hierarchy, and relationship building.',
      emea: 'Balance European formality with Middle Eastern relationship focus. Highlight international experience.',
      apac: 'Consider Asia-Pacific business values: collective achievement, continuous learning, and respect for experience.',
      americas: 'Use direct, achievement-focused language common in North and South American business culture.',
    };

    const resumeContext = `
Name: ${resume.contactInfo.fullName}
Current/Recent Role: ${resume.experience?.[0]?.position || 'Not specified'} at ${resume.experience?.[0]?.company || 'Not specified'}
Summary: ${resume.summary || 'Not provided'}
Skills: ${resume.skills?.join(', ') || 'Not listed'}
Experience Highlights: ${resume.experience?.slice(0, 3).map(e => `${e.position} at ${e.company}`).join('; ') || 'Not listed'}
Education: ${resume.education?.[0]?.degree} in ${resume.education?.[0]?.field} from ${resume.education?.[0]?.institution || 'Not listed'}
${targetRole ? `Target Role: ${targetRole}` : ''}
`;

    const prompt = `You are a LinkedIn optimization expert who helps professionals create compelling profiles. Your specialty is transforming resume content into LinkedIn-optimized copy that drives recruiter engagement.

${regionContext[region]}

Based on this resume data:
${resumeContext}

Generate a comprehensive LinkedIn optimization package. Return a JSON object with this structure:

{
  "headlines": [
    "<5 compelling LinkedIn headline options, 120 chars max each, include keywords and value proposition>"
  ],
  "aboutSections": {
    "short": "<150 words - punchy, hook-driven, mobile-friendly>",
    "medium": "<300 words - balanced, includes key achievements and personality>",
    "long": "<500 words - detailed story arc, comprehensive but engaging>"
  },
  "experienceRewrites": [
    {
      "original": "<original description/achievements combined>",
      "linkedin": "<rewritten for LinkedIn's more conversational, first-person style>",
      "position": "<job title>",
      "company": "<company name>"
    }
  ],
  "suggestedSkills": ["<15-20 skills optimized for LinkedIn search, including exact-match keywords>"],
  "keywords": ["<10-15 industry and role-specific keywords to include in profile>"],
  "tips": ["<3-5 specific tips for this person's LinkedIn profile optimization>"]
}

Guidelines:
1. Headlines should be keyword-rich but human - avoid jargon soup
2. About sections should use first person ("I") and show personality
3. Experience rewrites should be conversational vs resume bullet points
4. Skills should include both broad and specific terms recruiters search for
5. Make content scannable with strategic line breaks in About sections`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn optimization API error:', errorText);
      
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key. Please check your AI settings.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 429) {
        const errorMsg = useGeminiDirect
          ? 'Rate limit exceeded. Your Gemini key may have hit its quota.'
          : 'Too many requests. Please try again later.';
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: errorMsg }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('LinkedIn optimization failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: LinkedInOptimizeResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonString.trim());
    } catch (e) {
      console.error('Failed to parse LinkedIn optimization response:', e, 'Content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('LinkedIn optimization completed successfully');

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('LinkedIn optimization error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
