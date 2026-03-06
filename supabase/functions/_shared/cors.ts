const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost',           // Capacitor Android (legacy)
  'https://localhost',          // Capacitor Android v5+
  'capacitor://localhost',      // Capacitor iOS
  'https://wiseresume.magdysaber.com',
  'https://wiseresume.lovable.app',
  'https://thewise.cloud',
];

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [...ALLOWED_ORIGINS];

  if (allowedOrigin) {
    origins.push(allowedOrigin);
  }

  const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('https://localhost');
  const isNativeApp = !origin || origin === 'null';
  const isLovable = origin?.endsWith('.lovableproject.com') || origin?.endsWith('.lovable.app');
  const isAllowed = isNativeApp || isLocalhost || isLovable || (origin && origins.includes(origin));

  // For allowed origins, echo back the actual origin. For unknown origins, use wildcard.
  const resolvedOrigin = isAllowed && origin ? origin : '*';

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
};
