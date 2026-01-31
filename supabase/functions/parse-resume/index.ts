import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Resume data structure matching the frontend ResumeData type
interface ParsedResume {
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }>;
  skills: string[];
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
}

// Tool definition for structured output
const parseResumeTool = {
  type: "function",
  function: {
    name: "parse_resume",
    description: "Parse resume text into structured data with contact info, experience, education, skills, and certifications",
    parameters: {
      type: "object",
      properties: {
        contactInfo: {
          type: "object",
          properties: {
            fullName: { type: "string", description: "Full name of the candidate" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number" },
            location: { type: "string", description: "City, state/country location" },
            linkedin: { type: "string", description: "LinkedIn profile URL if present" },
            portfolio: { type: "string", description: "Portfolio/website URL if present" },
          },
          required: ["fullName", "email", "phone", "location"],
        },
        summary: {
          type: "string",
          description: "Professional summary or objective statement. If none exists, create a brief one based on the experience.",
        },
        experience: {
          type: "array",
          description: "Work experience entries, ordered from most recent to oldest",
          items: {
            type: "object",
            properties: {
              company: { type: "string", description: "Company/organization name" },
              position: { type: "string", description: "Job title/position" },
              startDate: { type: "string", description: "Start date (format: MMM YYYY or YYYY)" },
              endDate: { type: "string", description: "End date (format: MMM YYYY or YYYY, or 'Present' if current)" },
              current: { type: "boolean", description: "True if this is the current job" },
              description: { type: "string", description: "Job description and responsibilities" },
              achievements: {
                type: "array",
                items: { type: "string" },
                description: "Key achievements or bullet points",
              },
            },
            required: ["company", "position", "startDate", "endDate", "current", "description", "achievements"],
          },
        },
        education: {
          type: "array",
          description: "Education entries",
          items: {
            type: "object",
            properties: {
              institution: { type: "string", description: "School/university name" },
              degree: { type: "string", description: "Degree type (e.g., Bachelor's, Master's, PhD)" },
              field: { type: "string", description: "Field of study/major" },
              startDate: { type: "string", description: "Start date (format: YYYY or MMM YYYY)" },
              endDate: { type: "string", description: "End date or expected graduation (format: YYYY or MMM YYYY)" },
              gpa: { type: "string", description: "GPA if mentioned" },
            },
            required: ["institution", "degree", "field", "startDate", "endDate"],
          },
        },
        skills: {
          type: "array",
          items: { type: "string" },
          description: "List of skills, technologies, tools, and competencies",
        },
        certifications: {
          type: "array",
          description: "Professional certifications",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Certification name" },
              issuer: { type: "string", description: "Issuing organization" },
              date: { type: "string", description: "Date obtained" },
              expiryDate: { type: "string", description: "Expiry date if applicable" },
              credentialId: { type: "string", description: "Credential ID if mentioned" },
            },
            required: ["name", "issuer", "date"],
          },
        },
      },
      required: ["contactInfo", "summary", "experience", "education", "skills", "certifications"],
    },
  },
};

const systemPrompt = `You are an expert resume parser. Your task is to extract structured information from resume text.

IMPORTANT GUIDELINES:
1. Extract ALL information present in the resume - don't skip any jobs, education, or skills
2. If a field is not found, use empty string "" for required string fields and empty array [] for array fields
3. Parse dates in a consistent format (MMM YYYY preferred, e.g., "Jan 2020")
4. For current jobs, set endDate to "Present" and current to true
5. Extract skills as individual items, not comma-separated strings
6. Achievements should be separate bullet points, not combined
7. Handle various resume formats: chronological, functional, combination
8. Be thorough - extract every piece of relevant information

The resume text may have OCR artifacts or unusual formatting - do your best to interpret it correctly.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing resume text, length:', text.length);

    // Call Lovable AI with tool calling for structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse the following resume text and extract all structured information:\n\n${text}` },
        ],
        tools: [parseResumeTool],
        tool_choice: { type: 'function', function: { name: 'parse_resume' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to parse resume with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('AI response received');

    // Extract the tool call arguments
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'parse_resume') {
      console.error('Unexpected AI response format:', JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: 'AI returned unexpected response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the function arguments
    let parsedData: ParsedResume;
    try {
      parsedData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse AI response JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'AI returned invalid JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique IDs for experience, education, and certifications
    const generateId = () => crypto.randomUUID();

    const resumeData = {
      contactInfo: {
        fullName: parsedData.contactInfo.fullName || '',
        email: parsedData.contactInfo.email || '',
        phone: parsedData.contactInfo.phone || '',
        location: parsedData.contactInfo.location || '',
        linkedin: parsedData.contactInfo.linkedin || undefined,
        portfolio: parsedData.contactInfo.portfolio || undefined,
      },
      summary: parsedData.summary || '',
      experience: (parsedData.experience || []).map(exp => ({
        id: generateId(),
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || false,
        description: exp.description || '',
        achievements: exp.achievements || [],
      })),
      education: (parsedData.education || []).map(edu => ({
        id: generateId(),
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: edu.gpa || undefined,
      })),
      skills: parsedData.skills || [],
      certifications: (parsedData.certifications || []).map(cert => ({
        id: generateId(),
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || '',
        expiryDate: cert.expiryDate || undefined,
        credentialId: cert.credentialId || undefined,
      })),
      templateId: 'modern',
    };

    console.log('Successfully parsed resume:', {
      name: resumeData.contactInfo.fullName,
      experienceCount: resumeData.experience.length,
      educationCount: resumeData.education.length,
      skillsCount: resumeData.skills.length,
    });

    return new Response(
      JSON.stringify(resumeData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('parse-resume error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
