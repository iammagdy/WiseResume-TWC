import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCREENSHOT_PROMPTS = [
  {
    name: "01-hero",
    headline: "Your AI Career Companion",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background transitioning from deep navy (#0a0e2a) to rich purple (#1a1040). At the top center, bold white headline text in a geometric sans-serif font reading 'Your AI Career Companion'. Below, an iPhone 15 Pro device frame (silver titanium) showing a hero app screen with: a glowing rose-red (#e11d48) logo mark, large CTA button saying 'Get Started', subtle particle effects and stars in the background. Clean, premium, Apple-quality marketing image. No watermarks.",
  },
  {
    name: "02-resume-builder",
    headline: "Build ATS-Optimized Resumes",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background from deep navy (#0a0e2a) to purple (#1a1040). Bold white headline 'Build ATS-Optimized Resumes' at top. iPhone 15 Pro frame showing a dashboard with 3 resume cards, each with a circular health score (85%, 72%, 91%) in green/yellow/green, resume titles, and last-edited dates. Cards have subtle glass-morphism styling with rose-red accents. Clean Apple marketing style.",
  },
  {
    name: "03-job-tailoring",
    headline: "One-Tap Job Tailoring",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background from deep navy to purple. Bold white headline 'One-Tap Job Tailoring' at top. iPhone 15 Pro frame showing an AI tools grid with 6 colorful icon tiles: Tailor Resume (rose-red), Score Check (green), Cover Letter (blue), Interview Prep (orange), LinkedIn Optimizer (cyan), Proofread (purple). Each tile has a rounded icon and label. Modern glass-morphism card design.",
  },
  {
    name: "04-interview-coach",
    headline: "Practice With AI Voice Coach",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background. Bold white headline 'Practice With AI Voice Coach' at top. iPhone 15 Pro frame showing an interview practice screen with: a voice waveform visualization in rose-red, a question card reading 'Tell me about yourself', a timer showing 2:34, and a large microphone button at the bottom. Dark themed UI with glass effects.",
  },
  {
    name: "05-recruiter-feedback",
    headline: "Get Honest Recruiter Feedback",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background. Bold white headline 'Get Honest Recruiter Feedback' at top. iPhone 15 Pro frame showing 4 recruiter persona cards arranged in a 2x2 grid: Tech Recruiter (with green 'HIRE' badge), HR Director (with red 'REJECT' badge), Startup Founder (with green 'HIRE' badge), Agency Recruiter (with yellow 'MAYBE' badge). Each card has an avatar circle and score. Glass-morphism styling.",
  },
  {
    name: "06-templates",
    headline: "30 Professional Templates",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background. Bold white headline '30 Professional Templates' at top. iPhone 15 Pro frame showing a template gallery grid (3 columns, 3 rows) with miniature resume template previews. Each template has a different color accent (red, blue, green, purple, orange, teal, pink, gold, navy). Templates show tiny text lines mimicking resume content. Clean gallery UI.",
  },
  {
    name: "07-application-tracker",
    headline: "Track Every Application",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background. Bold white headline 'Track Every Application' at top. iPhone 15 Pro frame showing a Kanban board with 3 columns: 'Applied' (blue, 4 cards), 'Interview' (orange, 2 cards), 'Offer' (green, 1 card). Each card shows a company name and job title. Glass-morphism column headers with colored indicators.",
  },
  {
    name: "08-portfolio",
    headline: "Share Your Online Portfolio",
    prompt:
      "Professional App Store screenshot, 1290x2796 pixels, portrait orientation. Dark cosmic gradient background. Bold white headline 'Share Your Online Portfolio' at top. iPhone 15 Pro frame showing a portfolio profile page with: a circular avatar photo placeholder, name and job title, stats row (views, projects, skills), and 3 project cards below with colorful thumbnails. Share button and QR code icon visible. Modern dark UI with rose-red accents.",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Clear previous screenshots
    const { data: existingFiles } = await supabase.storage
      .from("screenshots")
      .list();
    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from("screenshots")
        .remove(existingFiles.map((f) => f.name));
    }
    await supabase.from("store_screenshots").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const results: Array<{ name: string; headline: string; image_url: string }> = [];

    for (const item of SCREENSHOT_PROMPTS) {
      console.log(`Generating: ${item.name}...`);

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: item.prompt,
              },
            ],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${item.name}: ${aiResponse.status} ${errText}`);
        continue;
      }

      const aiData = await aiResponse.json();
      const imageData =
        aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageData) {
        console.error(`No image returned for ${item.name}`);
        continue;
      }

      // Convert base64 to Uint8Array
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fileName = `${item.name}.png`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(fileName, bytes, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${item.name}:`, uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("screenshots")
        .getPublicUrl(fileName);

      const image_url = publicUrlData.publicUrl;

      // Save metadata
      await supabase.from("store_screenshots").insert({
        name: item.name,
        headline: item.headline,
        image_url,
      });

      results.push({ name: item.name, headline: item.headline, image_url });
      console.log(`✅ Done: ${item.name}`);
    }

    return new Response(JSON.stringify({ success: true, screenshots: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
