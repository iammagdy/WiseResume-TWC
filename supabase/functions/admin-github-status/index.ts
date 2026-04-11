const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
  } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { password: string };
    const { password } = body;

    const devKitPassword = Deno.env.get('DEV_KIT_PASSWORD');
    if (!devKitPassword || password !== devKitPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'GITHUB_TOKEN secret is not configured in Supabase Edge Function Secrets.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!githubOwner || !githubRepo) {
      return new Response(
        JSON.stringify({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO secrets must be set in Supabase Edge Function Secrets.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits?per_page=5`;
    const resp = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'WiseResume-DevKit/1.0',
      },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `GitHub API error ${resp.status}: ${errText.slice(0, 200)}\n\nAttempted URL: ${apiUrl}\n\nCheck that GITHUB_OWNER ("${githubOwner}") and GITHUB_REPO ("${githubRepo}") match your actual GitHub repository URL.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rawCommits = await resp.json() as GitHubCommitResponse[];

    const commits = rawCommits.map((c) => ({
      sha: c.sha,
      message: (c.commit?.message ?? '').split('\n')[0],
      author: c.commit?.author?.name ?? c.author?.login ?? 'Unknown',
      timestamp: c.commit?.author?.date ?? '',
      url: c.html_url ?? '',
    }));

    return new Response(
      JSON.stringify({
        success: true,
        commits,
        repoUrl: `https://github.com/${githubOwner}/${githubRepo}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
