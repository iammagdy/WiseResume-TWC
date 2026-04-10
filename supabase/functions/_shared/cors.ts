const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5000',      // Vite default (this project)
  'http://localhost:5173',      // Vite alternative port
  'http://localhost',           // Capacitor Android (legacy)
  'https://localhost',          // Capacitor Android v5+
  'capacitor://localhost',      // Capacitor iOS
  'https://resume.thewise.cloud',
  'https://thewise.cloud',
];

export const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const origins = [...ALLOWED_ORIGINS];

  if (allowedOrigin) {
    origins.push(allowedOrigin);
  }

  // Allow any Replit dev domain for development testing
  const isReplitDev = !!(origin && /\.replit\.dev$/.test(origin));
  const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('https://localhost');
  const isNativeApp = !origin || origin === 'null';
  const isAllowed = isNativeApp || isLocalhost || isReplitDev || (origin && origins.includes(origin));

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };

  if (isAllowed) {
    if (origin && origin !== 'null') {
      headers['Access-Control-Allow-Origin'] = origin;
    }
    // Native apps (no Origin / 'null' origin) don't need the ACAO header — webviews don't enforce CORS
  }

  return headers;
};
