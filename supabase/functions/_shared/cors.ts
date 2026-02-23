const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost',           // Capacitor Android (legacy)
  'https://localhost',          // Capacitor Android v5+
  'capacitor://localhost',      // Capacitor iOS
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [...ALLOWED_ORIGINS];

  if (allowedOrigin) {
    origins.push(allowedOrigin);
  }

  const isLovablePreview = origin?.endsWith('.lovable.app') || origin?.endsWith('.lovableproject.com');
  const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('https://localhost');
  const isNativeApp = !origin || origin === 'null' || isLocalhost;
  const isAllowed = isNativeApp || (origin && (origins.includes(origin) || isLovablePreview));

  return {
    'Access-Control-Allow-Origin': isNativeApp ? origins[0] : (isAllowed ? origin! : origins[0]),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};
