import Constants from 'expo-constants';

interface MobileConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  kindeDomain: string;
  kindeClientId: string;
  sentryDsn: string | null;
  webUrl: string;
}

function read(name: string): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const value = extra[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function require_(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(
      `[mobile/config] Missing required env var "${name}". Set EXPO_PUBLIC_${
        name.replace(/([A-Z])/g, '_$1').toUpperCase()
      } before building.`,
    );
  }
  return value;
}

let cached: MobileConfig | null = null;

export function getConfig(): MobileConfig {
  if (cached) return cached;
  cached = {
    supabaseUrl: require_('supabaseUrl'),
    supabaseAnonKey: require_('supabaseAnonKey'),
    kindeDomain: require_('kindeDomain'),
    kindeClientId: require_('kindeClientId'),
    sentryDsn: read('sentryDsn'),
    webUrl: read('webUrl') ?? 'https://wiseresume.app',
  };
  return cached;
}
