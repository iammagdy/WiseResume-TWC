import { supabase } from '@/integrations/supabase/safeClient';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const isLovableDomain =
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com');

function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://localhost/auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
}

export async function signInWithGoogle(): Promise<void> {
  try {
    if (isLovableDomain) {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } else {
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
        if (oauthUrl.hostname !== 'accounts.google.com') {
          throw new Error('Invalid OAuth redirect URL');
        }
        window.location.href = data.url;
      }
    }
  } catch (err) {
    toast.error('Failed to sign in with Google');
    throw err;
  }
}

export async function signInWithApple(): Promise<void> {
  try {
    if (isLovableDomain) {
      const { error } = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } else {
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
        window.location.href = data.url;
      }
    }
  } catch (err) {
    toast.error('Failed to sign in with Apple');
    throw err;
  }
}
