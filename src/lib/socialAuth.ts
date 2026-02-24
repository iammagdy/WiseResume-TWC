import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    // Use custom scheme so Android intent filters can intercept the redirect
    return 'com.wiseresume.app://auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
}

async function openOAuthUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
}

export async function signInWithGoogle(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      const oauthUrl = new URL(data.url);
      if (oauthUrl.hostname !== 'accounts.google.com' && !oauthUrl.hostname.includes('supabase.co')) {
        console.warn('Redirecting to non-Google/Supabase OAuth URL:', data.url);
      }
      await openOAuthUrl(data.url);
    }
  } catch (err) {
    toast.error('Failed to sign in with Google');
    throw err;
  }
}

export async function signInWithApple(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: getOAuthRedirectUrl(),
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (data?.url) {
      const oauthUrl = new URL(data.url);
      if (oauthUrl.hostname !== 'appleid.apple.com') {
        throw new Error('Invalid OAuth redirect URL');
      }
      await openOAuthUrl(data.url);
    }
  } catch (err) {
    toast.error('Failed to sign in with Apple');
    throw err;
  }
}
