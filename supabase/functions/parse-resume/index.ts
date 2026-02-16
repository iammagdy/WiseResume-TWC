import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callAI, isAIError } from "../_shared/aiClient.ts";

const MAX_TEXT_LENGTH = 100 * 1024;

const parseResumeTool = {
  type: "function" as const,
  function: {
    name: "parse_resume",
    description: "Parse resume text into structured data",
    parameters: {
      type: "object",
      properties: {
        contactInfo: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            linkedin: { type: "string" },
            portfolio: { type: "string" },
          },
          required: ["fullName", "email", "phone", "location"],
        },
        summary: { type: "string" },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              position: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              current: { type: "boolean" },
              description: { type: "string" },
              achievements: { type: "array", items: { type: "string" } },
              responsibilities: { type: "array", items: { type: "string" } },
              isProject: { type: "boolean" },
            },
            required: ["company", "position", "startDate", "endDate", "current", "description", "achievements"],
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
              startDate: { type: "string" },
              endDate: { type: "string" },
              gpa: { type: "string" },
            },
            required: ["institution", "degree", "field", "startDate", "endDate"],
          },
        },
        skills: { type: "array", items: { type: "string" } },
        certifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              issuer: { type: "string" },
              date: { type: "string" },
              expiryDate: { type: "string" },
              credentialId: { type: "string" },
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

=== CRITICAL RULES ===
1. Process ALL content from the entire text. Do NOT stop after the first page.
2. Extract 100% of text in work experience. Do NOT summarize.
3. Copy each bullet point EXACTLY as written. Never combine or condense.
4. Extract EVERYTHING - all jobs, education, projects, skills, certifications.
5. Empty fields: use "" for strings, [] for arrays.
6. Dates: Accept ANY format. Current roles: endDate="Present", current=true.
7. Skills: Parse as individual items. Include languages with proficiency.
8. Projects: Add to experience with isProject=true.

=== NAME DETECTION ===
- The name is usually on the VERY FIRST LINE
- Never use emails, phone numbers, URLs, or section headers as names
- If unsure, set fullName to ""`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { text, userGeminiKey } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "text" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Resume text too large. Maximum ${MAX_TEXT_LENGTH / 1024}KB.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse the following resume text:\n\n${text}` },
      ],
      tools: [parseResumeTool],
      toolChoice: { type: 'function', function: { name: 'parse_resume' } },
      userGeminiKey,
    });

    const toolCall = aiResponse.toolCalls?.[0];
    if (!toolCall || toolCall.function.name !== 'parse_resume') {
      return new Response(
        JSON.stringify({ error: 'AI returned unexpected response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    const generateId = () => crypto.randomUUID();

    // Validate name
    let fullName = parsedData.contactInfo.fullName || '';
    const invalidNamePatterns = /^(contact|summary|profile|resume|cv|about|personal|objective|experience|education|skills|hire me|get in touch)/i;
    const looksLikeEmail = fullName.includes('@');
    const looksLikeUrl = /https?:|www\.|\.com|\.linkedin/i.test(fullName);
    const looksLikePhone = /^\+?\d[\d\s\-()]{6,}$/.test(fullName);
    const tooFewWords = fullName.trim().split(/\s+/).length < 2;

    if (invalidNamePatterns.test(fullName.trim()) || looksLikeEmail || looksLikeUrl || looksLikePhone || tooFewWords) {
      const firstLines = text.split('\n').filter((l: string) => l.trim()).slice(0, 5);
      const nameCandidate = firstLines.find((line: string) => {
        const t = line.trim();
        const words = t.split(/\s+/);
        return words.length >= 2 && words.length <= 5 && 
               /^[A-Za-z\u00C0-\u024F\u0600-\u06FF\- ']+$/.test(t) &&
               !invalidNamePatterns.test(t);
      });
      fullName = nameCandidate?.trim() || '';
    }

    const resumeData = {
      contactInfo: {
        fullName,
        email: parsedData.contactInfo.email || '',
        phone: parsedData.contactInfo.phone || '',
        location: parsedData.contactInfo.location || '',
        linkedin: parsedData.contactInfo.linkedin || undefined,
        portfolio: parsedData.contactInfo.portfolio || undefined,
      },
      summary: parsedData.summary || '',
      experience: (parsedData.experience || []).map((exp: any) => ({
        id: generateId(),
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        current: exp.current || false,
        description: exp.description || '',
        achievements: exp.achievements || [],
        responsibilities: exp.responsibilities || [],
        isProject: exp.isProject || false,
      })),
      education: (parsedData.education || []).map((edu: any) => ({
        id: generateId(),
        institution: edu.institution || '',
        degree: edu.degree || '',
        field: edu.field || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: edu.gpa || undefined,
      })),
      skills: parsedData.skills || [],
      certifications: (parsedData.certifications || []).map((cert: any) => ({
        id: generateId(),
        name: cert.name || '',
        issuer: cert.issuer || '',
        date: cert.date || '',
        expiryDate: cert.expiryDate || undefined,
        credentialId: cert.credentialId || undefined,
      })),
    };

    // Calculate completeness score
    let completeness = 0;
    if (resumeData.contactInfo.fullName) completeness += 15;
    if (resumeData.contactInfo.email) completeness += 10;
    if (resumeData.contactInfo.phone) completeness += 5;
    if (resumeData.summary) completeness += 15;
    if (resumeData.experience.length > 0) completeness += 25;
    if (resumeData.education.length > 0) completeness += 15;
    if (resumeData.skills.length > 0) completeness += 10;
    if (resumeData.certifications.length > 0) completeness += 5;

    console.log(`parse-resume: Extracted ${resumeData.experience.length} experiences, ${resumeData.education.length} education, ${resumeData.skills.length} skills. Completeness: ${completeness}%`);

    return new Response(JSON.stringify(resumeData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('parse-resume error:', error);
    const status = isAIError(error) ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
