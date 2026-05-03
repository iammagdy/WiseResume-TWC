import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { secureStorage } from './secureStore';
import { getConfig } from './config';
import { callEdgeFunction } from './api';

WebBrowser.maybeCompleteAuthSession();

const KINDE_TOKEN_KEY = 'wr.kinde.token';
const BRIDGE_TOKEN_KEY = 'wr.bridge.token';
const BRIDGE_USER_KEY = 'wr.bridge.user';

export interface BridgeIdentity {
  userId: string;
  email: string;
  name?: string;
  expiresAt: number;
}

interface TokenExchangeResponse {
  token: string;
  user: { id: string; email: string; name?: string };
  expires_at: number;
}

const cfg = getConfig();

const discovery = {
  authorizationEndpoint: `${cfg.kindeDomain}/oauth2/auth`,
  tokenEndpoint: `${cfg.kindeDomain}/oauth2/token`,
  revocationEndpoint: `${cfg.kindeDomain}/oauth2/revoke`,
  userInfoEndpoint: `${cfg.kindeDomain}/oauth2/user_profile`,
  endSessionEndpoint: `${cfg.kindeDomain}/logout`,
};

export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: undefined,
    path: 'auth/callback',
  });
}

/**
 * Run the Kinde PKCE OAuth flow inside an in-app browser, exchange
 * the resulting Kinde access token for a WiseResume bridge JWT, and
 * persist both tokens to secure storage. Returns the resolved bridge
 * identity, or null if the user cancelled.
 */
export async function signInWithKinde(): Promise<BridgeIdentity | null> {
  const redirectUri = getRedirectUri();

  const codeVerifier = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Crypto.randomUUID() + Crypto.randomUUID(),
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const request = new AuthSession.AuthRequest({
    clientId: cfg.kindeClientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email', 'offline'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    extraParams: {
      audience: cfg.kindeDomain,
    },
  });
  await request.makeAuthUrlAsync(discovery);

  const result = await request.promptAsync(discovery, {
    showInRecents: false,
  });

  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  const tokenRes = await AuthSession.exchangeCodeAsync(
    {
      clientId: cfg.kindeClientId,
      code: result.params.code,
      redirectUri,
      extraParams: codeVerifier
        ? { code_verifier: request.codeVerifier ?? codeVerifier }
        : undefined,
    },
    discovery,
  );

  const kindeToken = tokenRes.accessToken;
  if (!kindeToken) {
    throw new Error('Kinde did not return an access token.');
  }
  await secureStorage.setItem(KINDE_TOKEN_KEY, kindeToken);

  return await exchangeKindeForBridge(kindeToken);
}

export async function exchangeKindeForBridge(kindeToken: string): Promise<BridgeIdentity> {
  const exchanged = await callEdgeFunction<TokenExchangeResponse>('token-exchange', {
    body: { token: kindeToken },
    skipAuth: true,
  });

  const identity: BridgeIdentity = {
    userId: exchanged.user.id,
    email: exchanged.user.email,
    name: exchanged.user.name,
    expiresAt: exchanged.expires_at,
  };

  await secureStorage.setItem(BRIDGE_TOKEN_KEY, exchanged.token);
  await secureStorage.setItem(BRIDGE_USER_KEY, JSON.stringify(identity));
  return identity;
}

export async function getStoredIdentity(): Promise<BridgeIdentity | null> {
  const raw = await secureStorage.getItem(BRIDGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BridgeIdentity;
  } catch {
    return null;
  }
}

export async function getBridgeToken(): Promise<string | null> {
  return secureStorage.getItem(BRIDGE_TOKEN_KEY);
}

export async function signOut(): Promise<void> {
  await Promise.all([
    secureStorage.removeItem(KINDE_TOKEN_KEY),
    secureStorage.removeItem(BRIDGE_TOKEN_KEY),
    secureStorage.removeItem(BRIDGE_USER_KEY),
  ]);
}
