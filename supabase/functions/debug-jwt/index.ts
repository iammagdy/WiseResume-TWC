import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  let claims: Record<string, unknown> = {};
  try {
    const parts = token.split('.');
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
    claims = JSON.parse(atob(padded));
  } catch {
    claims = { error: 'Could not decode token', tokenPresent: !!token };
  }

  return new Response(JSON.stringify({
    sub: claims['sub'],
    supabaseUuid: claims['supabaseUuid'],
    iss: claims['iss'],
    exp: claims['exp'],
    tokenLength: token.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
