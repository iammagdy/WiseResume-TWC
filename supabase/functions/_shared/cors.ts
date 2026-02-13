const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [...ALLOWED_ORIGINS];

  if (allowedOrigin) {
    origins.push(allowedOrigin);
  }

  const isLovablePreview = origin?.endsWith('.lovable.app');
  const isAllowed = origin && (origins.includes(origin) || isLovablePreview);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : origins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};
