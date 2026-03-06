import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return 'com.wiseresume.app://auth/callback';
  }
  return window.location.origin;
}

export async function signInWithGoogle(): Promise<void> {
  try {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: getOAuthRedirectUrl(),
    });
    if (result.error) throw result.error;
  } catch (err) {
    toast.error('Failed to sign in with Google');
    throw err;
  }
}

export async function signInWithApple(): Promise<void> {
  try {
    const result = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: getOAuthRedirectUrl(),
    });
    if (result.error) throw result.error;
  } catch (err) {
    toast.error('Failed to sign in with Apple');
    throw err;
  }
}
