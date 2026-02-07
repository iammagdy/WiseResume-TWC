import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    isProject?: boolean;
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
          description: "Work experience AND project entries, ordered from most recent to oldest. Include projects with isProject=true",
          items: {
            type: "object",
            properties: {
              company: { type: "string", description: "Company/organization name. For projects, use project name or 'Personal Project'" },
              position: { type: "string", description: "Job title/position. For projects, use role like 'Developer' or 'Creator'" },
              startDate: { type: "string", description: "Start date - accept any format: MMM YYYY, YYYY, Summer 2024, etc." },
              endDate: { type: "string", description: "End date - accept any format, or 'Present' if current/ongoing" },
              current: { type: "boolean", description: "True if this is the current job or ongoing project" },
              description: { type: "string", description: "Job/project description and responsibilities" },
              achievements: {
                type: "array",
                items: { type: "string" },
                description: "Key achievements, features built, or bullet points",
              },
              isProject: { type: "boolean", description: "True if this is a personal/academic project, false for work experience" },
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

const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

CRITICAL RULES:
1. Extract EVERYTHING - all jobs, education, projects, skills, certifications. Never skip sections!
2. Empty fields: use "" for strings, [] for arrays - never omit required fields
3. Dates: Accept ANY format ("2024", "Summer 2024", "Jan 2020 - Present", "2020-2023")
4. Current roles/projects: endDate="Present", current=true
5. Skills: Parse as individual items. Include languages with proficiency (e.g., "Arabic (Native)", "English (Fluent)")
6. Projects: Add to experience array with isProject=true, company=project name or "Personal Project"
7. Languages: Add to skills array with level, e.g., "French (Beginner)", "Spanish (Intermediate)"
8. Certifications: Include issuer from context when available. Match "Certificates", "Training", "Courses" sections
9. Phone numbers: Extract exactly as written (supports international formats like +20, 011xxx, etc.)
10. Handle sidebar layouts, two-column designs, and creative CV formats

CRITICAL NAME DETECTION RULES:
11. The person's FULL NAME is typically the LARGEST/most prominent text at the very TOP of the resume
12. NEVER use these as names - they are section headers/labels:
    - "Contact Me", "Contact", "Contact Info", "Contact Details", "Get In Touch"
    - "Personal Information", "Personal Info", "Personal Details", "Personal Data"
    - "About Me", "About", "Profile", "Bio", "Summary", "Objective"
    - "Resume", "CV", "Curriculum Vitae"
    - Any single generic word that describes a section (Contact, Summary, Skills, Experience, Education)
13. A valid name is usually 2-5 words containing a first name and last name (e.g., "John Smith", "Mohamed Ahmed Ali")
14. Names are NEVER verbs or action phrases like "Contact Me" or "Hire Me"
15. Names often appear in ALL CAPS or Title Case at the document start, BEFORE any section headers
16. If the first line looks like a section header, look for the actual person name nearby (usually largest text)

SECTION NAME VARIANTS TO RECOGNIZE:
- Experience → Work Experience, Employment, Professional Experience, Career History
- Education → Academic Background, Qualifications, Schooling
- Skills → Technical Skills, Core Competencies, Languages, Soft Skills, Hard Skills
- Certifications → Certificates, Credentials, Licenses, Training, Courses
- Projects → Portfolio, Personal Projects, Academic Projects, Work Samples

The resume may have OCR artifacts or unusual formatting - interpret it correctly and extract ALL content!`;

serve(async (req) => {
  // Handle CORS preflight
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
        isProject: exp.isProject || false,
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
