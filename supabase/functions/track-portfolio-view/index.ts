import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { "x-supabase-user-event": "true" } } }
  );

  try {
    const { username } = await req.json();

    if (!username) {
      return new Response("Missing username", { status: 400 });
    }

    // Increment view count for the user's profile
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({ views: `views + 1` })
      .eq("username", username)
      .select("views")
      .single();

    if (error) {
      console.error("Error incrementing view count:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ views: data.views }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
