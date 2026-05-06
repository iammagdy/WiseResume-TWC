import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

function jsonOk(cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function jsonError(cors: Record<string, string>, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(wrapHandler('track-handle-interest', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  let userId: string;
  let client: ReturnType<typeof Deno.env.get> extends string ? unknown : never;
  let userEmail: string | null = null;

  try {
    const auth = await requireAuth(req);
    userId = auth.userId;
    client = auth.client;
  } catch (err) {
    if (err instanceof AuthError) return jsonError(corsHeaders, err.message, err.status);
    return jsonError(corsHeaders, 'Unauthorized', 401);
  }

  const audienceId = Deno.env.get('RESEND_AUDIENCE_HANDLE_INTEREST')?.trim();
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();

  if (!audienceId || !resendKey) {
    return jsonOk(corsHeaders);
  }

  try {
    const typedClient = client as { from: (table: string) => unknown };

    const { data: profile } = await (typedClient
      .from('profiles') as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { handle_type?: string; email?: string } | null }>;
          };
        };
      })
      .select('handle_type, email')
      .eq('user_id', userId)
      .maybeSingle();

    const handleType = profile?.handle_type;
    if (handleType && handleType !== 'free') {
      return jsonOk(corsHeaders);
    }

    userEmail = profile?.email ?? null;

    if (!userEmail || userEmail.endsWith('@kinde.placeholder')) {
      return jsonOk(corsHeaders);
    }

    await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: userEmail, unsubscribed: false }),
    });
  } catch (err) {
    console.warn('[track-handle-interest] non-fatal error:', (err as Error)?.message);
  }

  return jsonOk(corsHeaders);
}));
