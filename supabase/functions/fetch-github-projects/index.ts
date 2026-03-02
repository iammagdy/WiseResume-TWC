import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth, authErrorResponse } from '../_shared/authMiddleware.ts';

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  topics: string[];
  updated_at: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, client } = await requireAuth(req);
    const { githubUsername } = await req.json();

    if (!githubUsername || typeof githubUsername !== 'string') {
      return new Response(
        JSON.stringify({ error: 'GitHub username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract username from URL if full URL provided
    const cleanUsername = githubUsername
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\/.*$/, '')
      .trim();

    if (!cleanUsername || cleanUsername.length < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub username' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch public repos (no auth needed, 60 req/hr limit)
    const ghResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=12&type=owner`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'WiseResume-Portfolio',
        },
      }
    );

    if (!ghResponse.ok) {
      if (ghResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'GitHub user not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (ghResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'GitHub rate limit reached. Try again in a few minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`GitHub API error: ${ghResponse.status}`);
    }

    const repos: GitHubRepo[] = await ghResponse.json();

    // Filter out forks and format
    const projects = repos
      .filter(r => !r.fork)
      .slice(0, 10)
      .map(r => ({
        name: r.name,
        description: r.description || '',
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        topics: r.topics || [],
        updatedAt: r.updated_at,
      }));

    // Cache in profile
    const { error: updateError } = await client
      .from('profiles')
      .update({
        github_projects_cache: projects,
        github_last_synced: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to cache GitHub projects:', updateError);
    }

    return new Response(
      JSON.stringify({ projects, syncedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      return authErrorResponse(err, origin);
    }
    console.error('fetch-github-projects error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
