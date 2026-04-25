import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    await requireAdminAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }

  const body = req.method === 'GET' ? {} : await req.json();
  const action: string = body.action ?? '';

  // ── GET RESEND BOUNCES ─────────────────────────────────────────────────
  if (action === 'get_resend_bounces') {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return json({ success: false, error: 'RESEND_API_KEY is not configured', bounces: [] }, 200, cors);
    }

    try {
      const resp = await fetch('https://api.resend.com/emails?limit=100', {
        headers: { Authorization: `Bearer ${resendKey}` },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return json({ success: false, error: `Resend API ${resp.status}: ${errText.slice(0, 200)}`, bounces: [] }, 200, cors);
      }

      const raw = await resp.json() as { data?: Array<Record<string, unknown>> };
      const emails = raw.data ?? [];

      const bounced = emails.filter((e) => {
        const status = ((e.last_event ?? e.status) as string | undefined)?.toLowerCase() ?? '';
        return status === 'bounced' || status === 'failed' || status === 'complained';
      }).map((e) => ({
        id: e.id,
        to: Array.isArray(e.to) ? (e.to as string[]).join(', ') : String(e.to ?? ''),
        subject: String(e.subject ?? ''),
        status: String(e.last_event ?? e.status ?? ''),
        created_at: String(e.created_at ?? ''),
      }));

      return json({ success: true, bounces: bounced, total_emails_checked: emails.length }, 200, cors);
    } catch (err) {
      return json({ success: false, error: String(err), bounces: [] }, 200, cors);
    }
  }

  // ── GET DEPLOY STATUS ──────────────────────────────────────────────────
  if (action === 'get_deploy_status') {
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubToken) return json({ success: false, error: 'GITHUB_TOKEN is not configured', runs: [] }, 200, cors);
    if (!githubOwner || !githubRepo) return json({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO must be set', runs: [] }, 200, cors);

    const workflow = body.workflow ?? 'deploy.yml';

    try {
      const resp = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflow}/runs?per_page=5`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WiseResume-DevKit/1.0',
          },
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return json({ success: false, error: `GitHub API ${resp.status}: ${errText.slice(0, 200)}`, runs: [] }, 200, cors);
      }

      const raw = await resp.json() as { workflow_runs?: Array<Record<string, unknown>> };
      const runs = (raw.workflow_runs ?? []).slice(0, 5).map((r) => ({
        id: r.id,
        name: String(r.name ?? ''),
        status: String(r.status ?? ''),
        conclusion: r.conclusion ? String(r.conclusion) : null,
        created_at: String(r.created_at ?? ''),
        updated_at: String(r.updated_at ?? ''),
        html_url: String(r.html_url ?? ''),
        head_commit: r.head_commit
          ? {
              message: (r.head_commit as Record<string, string>).message?.split('\n')[0] ?? '',
              author: (r.head_commit as Record<string, Record<string, string>>).author?.name ?? '',
            }
          : null,
      }));

      return json({ success: true, runs, workflow, repo_url: `https://github.com/${githubOwner}/${githubRepo}` }, 200, cors);
    } catch (err) {
      return json({ success: false, error: String(err), runs: [] }, 200, cors);
    }
  }

  // ── TRIGGER DEPLOY ─────────────────────────────────────────────────────
  if (action === 'trigger_deploy') {
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const githubOwner = Deno.env.get('GITHUB_OWNER');
    const githubRepo = Deno.env.get('GITHUB_REPO');

    if (!githubToken) return json({ success: false, error: 'GITHUB_TOKEN is not configured' }, 200, cors);
    if (!githubOwner || !githubRepo) return json({ success: false, error: 'GITHUB_OWNER and GITHUB_REPO must be set' }, 200, cors);

    const workflow = body.workflow ?? 'deploy.yml';
    const ref = body.ref ?? 'main';

    try {
      const resp = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflow}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WiseResume-DevKit/1.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref }),
        },
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return json({ success: false, error: `GitHub API ${resp.status}: ${errText.slice(0, 200)}` }, 200, cors);
      }

      return json({ success: true, message: `Deploy triggered on ${ref}`, workflow }, 200, cors);
    } catch (err) {
      return json({ success: false, error: String(err) }, 200, cors);
    }
  }

  return json({ success: false, error: `Unknown action: ${action}` }, 400, cors);
});
