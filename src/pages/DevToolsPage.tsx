import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Activity,
  Users,
  Tag,
  Settings,
  Clock,
  Lock,
  LayoutDashboard,
  Loader2,
  Eye,
  EyeOff,
  BarChart2,
  Filter,
  Rocket,
  Mail,
  Briefcase,
  AtSign,
  ChevronRight,
  BrainCircuit,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  Plug,
  Radio,
  Flag,
  Megaphone,
  Telescope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AnalyticsPanel } from '@/components/dev-kit/AnalyticsPanel';
import { OnboardingFunnelPanel } from '@/components/dev-kit/OnboardingFunnelPanel';
import { LiveActivityPanel } from '@/components/dev-kit/LiveActivityPanel';
import { DeploymentPanel } from '@/components/dev-kit/DeploymentPanel';
import { EmailManagementPanel } from '@/components/dev-kit/EmailManagementPanel';
import { WiseHireWaitlistPanel } from '@/components/dev-kit/WiseHireWaitlistPanel';
import { PortfolioUsernamesPanel } from '@/components/dev-kit/PortfolioUsernamesPanel';
import { OpenRouterPanel, GroqPanel } from '@/components/dev-kit/AIKeySlotPanels';
import { MissionControlPanel } from '@/components/dev-kit/MissionControlPanel';
import { FeatureFlagsPanel } from '@/components/dev-kit/FeatureFlagsPanel';
import { OwnerOpsPanel } from '@/components/dev-kit/OwnerOpsPanel';
import { AIRoutingPanel } from '@/components/dev-kit/AIRoutingPanel';
import { ObservabilityPanel } from '@/components/dev-kit/ObservabilityPanel';
import { ModerationPanel } from '@/components/dev-kit/ModerationPanel';
import { IntegrationsPanel } from '@/components/dev-kit/IntegrationsPanel';
import { DEV_KIT_VERSION } from '@/components/dev-kit/config';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { apiFnUrl } from '@/lib/apiFnUrl';
import { EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { DevKitSessionProvider, useDevKitSession, loadRememberedToken } from '@/contexts/DevKitSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

type Tab = 'mission' | 'overview' | 'analytics' | 'onboarding' | 'live' | 'deployment' | 'users' | 'coupons' | 'settings' | 'activity' | 'email' | 'wisehire' | 'portfolio' | 'openrouter' | 'groq' | 'flags' | 'owner-ops' | 'ai-routing' | 'observability' | 'moderation' | 'integrations';

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Monitor',
    items: [
      { id: 'mission', label: 'Mission Control', icon: Radio },
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart2 },
      { id: 'onboarding', label: 'Onboarding', icon: Filter },
      { id: 'live', label: 'Live Activity', icon: Activity },
    ],
  },
  {
    title: 'Manage',
    items: [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'email', label: 'Email', icon: Mail },
      { id: 'owner-ops', label: 'Owner Ops', icon: Megaphone },
      { id: 'coupons', label: 'Coupons', icon: Tag },
      { id: 'wisehire', label: 'WiseHire', icon: Briefcase },
      { id: 'portfolio', label: 'Portfolio', icon: AtSign },
      { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'flags', label: 'Feature Flags', icon: Flag },
      { id: 'ai-routing', label: 'AI Routing', icon: BrainCircuit },
      { id: 'observability', label: 'Observability', icon: Telescope },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'deployment', label: 'Deployment', icon: Rocket },
      { id: 'openrouter', label: 'OpenRouter', icon: BrainCircuit },
      { id: 'groq', label: 'Groq', icon: BrainCircuit },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'activity', label: 'Audit Log', icon: Clock },
    ],
  },
];

const TAB_LABELS: Record<Tab, string> = {
  mission: 'Mission Control',
  overview: 'Overview',
  analytics: 'Analytics',
  onboarding: 'Onboarding Funnel',
  live: 'Live Activity',
  deployment: 'Deployment',
  users: 'Users',
  coupons: 'Coupons',
  settings: 'Settings',
  activity: 'Audit Log',
  email: 'Email',
  wisehire: 'WiseHire',
  portfolio: 'Portfolio',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  flags: 'Feature Flags',
  'owner-ops': 'Owner Ops',
  'ai-routing': 'AI Routing',
  observability: 'Observability',
  moderation: 'Moderation',
  integrations: 'Integrations',
};

type ConnectionStatus = 'checking' | 'connected' | 'degraded' | 'disconnected';

function ConnectionPill({ status }: { status: ConnectionStatus }) {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking
      </span>
    );
  }
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
        Online
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
      <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
      Offline
    </span>
  );
}

// ---------- Biometric helpers ----------

const LS_WEBAUTHN_CRED_KEY = 'devkit_webauthn_cred_id';

function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

type BiometricMode = 'checking' | 'native' | 'webauthn' | 'unavailable';

async function detectBiometricMode(): Promise<BiometricMode> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeBiometric.isAvailable();
      return res.isAvailable ? 'native' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
  if (typeof PublicKeyCredential !== 'undefined') {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const credId = localStorage.getItem(LS_WEBAUTHN_CRED_KEY);
        return credId ? 'webauthn' : 'unavailable';
      }
    } catch { }
  }
  return 'unavailable';
}

async function nativeBiometricAuth(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock DevKit admin panel',
      title: 'Authenticate',
      subtitle: 'Use biometrics to unlock DevKit',
      useFallback: true,
      fallbackTitle: 'Use Device Password',
    });
    return true;
  } catch {
    return false;
  }
}

// WebAuthn is used here as a LOCAL device-level gating mechanism only.
// It protects the remembered DevKit token stored in localStorage (device biometric
// must succeed before the token is read). It does NOT replace server-side auth —
// the actual DevKit session token was issued by verify-dev-kit and remains the
// server-authoritative credential for all admin API calls.
async function webAuthnAuth(): Promise<boolean> {
  try {
    const credIdStr = localStorage.getItem(LS_WEBAUTHN_CRED_KEY);
    if (!credIdStr) return false;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fromBase64Url(credIdStr), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!cred;
  } catch {
    return false;
  }
}

async function registerWebAuthnCredential(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'WiseResume DevKit', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode('devkit-admin'),
          name: 'DevKit Admin',
          displayName: 'DevKit Admin',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(LS_WEBAUTHN_CRED_KEY, toBase64Url(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

// ---------- Login form ----------

function DevKitLoginForm() {
  const { unlock, hasRememberedSession, rememberedEmail } = useDevKitSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number | null>(null);
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [biometricMode, setBiometricMode] = useState<BiometricMode>('checking');
  const [biometricAuthenticating, setBiometricAuthenticating] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const biometricTriggeredRef = useRef(false);

  const isLockedOut = lockoutSecondsLeft !== null && lockoutSecondsLeft > 0;

  const formatLockoutTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
  };

  const startLockoutCountdown = useCallback((seconds: number) => {
    setLockoutSecondsLeft(seconds);
    if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    lockoutIntervalRef.current = setInterval(() => {
      setLockoutSecondsLeft(prev => {
        if (prev === null || prev <= 1) {
          if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    };
  }, []);

  // Pre-fill email from remembered session
  useEffect(() => {
    if (rememberedEmail) setEmail(rememberedEmail);
  }, [rememberedEmail]);

  // Detect biometric mode on mount. When a remembered session exists and biometric is
  // unavailable, auto-unlock immediately so the user never sees the login form.
  useEffect(() => {
    if (!hasRememberedSession) {
      setBiometricMode('unavailable');
      setShowFullForm(true);
      return;
    }
    detectBiometricMode().then(mode => {
      setBiometricMode(mode);
      if (mode === 'unavailable') {
        // No biometric available — auto-unlock with the stored token immediately.
        const remembered = loadRememberedToken();
        if (remembered) {
          unlock(remembered.token);
        } else {
          // Token expired or cleared — fall back to full login form.
          setShowFullForm(true);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRememberedSession]);

  // Auto-trigger biometric when mode is known and session exists
  useEffect(() => {
    if (biometricTriggeredRef.current) return;
    if (biometricMode === 'checking' || biometricMode === 'unavailable') return;
    if (!hasRememberedSession) return;
    biometricTriggeredRef.current = true;
    handleBiometricUnlock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricMode, hasRememberedSession]);

  const handleBiometricUnlock = useCallback(async () => {
    if (biometricAuthenticating) return;
    setBiometricAuthenticating(true);
    setBiometricFailed(false);

    let success = false;
    if (biometricMode === 'native') {
      success = await nativeBiometricAuth();
    } else if (biometricMode === 'webauthn') {
      success = await webAuthnAuth();
    }

    if (success) {
      const remembered = loadRememberedToken();
      if (remembered) {
        unlock(remembered.token);
      } else {
        // Token expired — fall back to full form
        setBiometricFailed(true);
        setShowFullForm(true);
      }
    } else {
      // Biometric failed — show password form automatically after first failure
      setBiometricFailed(true);
      setShowFullForm(true);
    }
    setBiometricAuthenticating(false);
  }, [biometricMode, biometricAuthenticating, unlock]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw.trim() || isLockedOut) return;

    setIsVerifying(true);
    setLoginError(null);

    const submittedEmail = email.trim();
    const submittedPw = pw;
    setPw('');

    try {
      // Direct fetch (not the edgeFunctions wrapper) so we can map every
      // status / body shape to a specific UI message. The wrapper consumes
      // non-2xx response bodies before the caller can see them, which
      // previously masked both lockout (429 + locked:true) and the function's
      // 500-level config-error responses behind a generic toast.
      const url = apiFnUrl('verify-dev-kit');
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(EDGE_FUNCTIONS_ANON_KEY ? {
              'Authorization': `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`,
              'apikey': EDGE_FUNCTIONS_ANON_KEY,
            } : {}),
          },
          body: JSON.stringify({
            email: submittedEmail,
            password: submittedPw,
            rememberMe,
          }),
        });
      } catch {
        // Network-level failure (offline, DNS, CORS preflight blocked).
        toast.error('Cannot reach the verification service', {
          description: 'Check your connection, then try again.',
          duration: 6000,
        });
        return;
      }

      // Parse body once; tolerate empty / non-JSON bodies.
      const rawText = await response.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }
      const bodyError = typeof data?.error === 'string' ? (data.error as string) : null;

      // Function not deployed at all (Supabase gateway 404, or .htaccess SPA fallback).
      if (response.status === 404) {
        toast.error('Verification function not found', {
          description: 'Deploy the "verify-dev-kit" Edge Function to Supabase.',
          duration: 6000,
        });
        return;
      }

      // Lockout: function returns 429 with { success:false, locked:true, retry_after_seconds }.
      if (response.status === 429 && data?.locked) {
        const rawRetry = data.retry_after_seconds;
        const retryAfter =
          typeof rawRetry === 'number' && Number.isFinite(rawRetry) && rawRetry > 0
            ? Math.min(Math.floor(rawRetry), 24 * 60 * 60) // cap at 24 h to guard against malformed payloads
            : 600;
        startLockoutCountdown(retryAfter);
        setLoginError(null);
        return;
      }

      // Server-side config drift / session-issue failure (500). Show the exact
      // diagnosis the function reports so an admin can fix the secret without
      // touching code, and a generic catch-all for anything else 5xx.
      if (response.status >= 500) {
        if (bodyError === 'DEV_KIT_PASSWORD secret is not configured.') {
          setLoginError('DEV_KIT_PASSWORD is not set in Supabase secrets — ask the deploy owner to push it.');
        } else if (bodyError === 'ADMIN_EMAILS secret is not configured.') {
          setLoginError('ADMIN_EMAILS is not set in Supabase secrets — admin allowlist is empty.');
        } else if (bodyError === 'Failed to issue session') {
          setLoginError('Could not create an admin session. Check the admin_sessions table and service-role key.');
        } else {
          setLoginError('Login service unavailable — check the verify-dev-kit edge function deploy.');
        }
        return;
      }

      // Success path: 200 + { success:true, token }.
      if (response.ok && data?.success && typeof data?.token === 'string') {
        setLockoutSecondsLeft(null);

        // After a successful "remember me" login on web, try to register WebAuthn credential
        if (rememberMe && !Capacitor.isNativePlatform()) {
          const isPlatformAvailable = typeof PublicKeyCredential !== 'undefined' &&
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
          if (isPlatformAvailable) {
            await registerWebAuthnCredential().catch(() => { });
          }
        }

        unlock(data.token as string, {
          rememberMe,
          expiresAt: data.expires_at as number,
          email: submittedEmail,
        });
        return;
      }

      // 200 + { success:false, authorized:false } — email not on allowlist.
      if (response.ok && data?.authorized === false) {
        setLoginError('This email is not authorised for admin access.');
        return;
      }

      // 400 — function rejected the request shape (e.g. missing fields).
      if (response.status === 400) {
        setLoginError(bodyError ?? 'Email and password are required.');
        return;
      }

      // 200 + { success:false } (wrong password) and any other unhandled shape
      // both fall through here — keep the existing generic message.
      setLoginError('Incorrect email or password — try again.');
    } catch {
      toast.error('System error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  // Biometric screen (when remembered session exists and biometric is available)
  const showBiometricScreen = hasRememberedSession &&
    (biometricMode === 'native' || biometricMode === 'webauthn') &&
    !showFullForm;

  const BiometricIcon = biometricMode === 'native' && Capacitor.isNativePlatform()
    ? Fingerprint
    : ScanFace;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Subtle background decoration using app theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 shadow-xl mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">WiseResume</h1>
            <p className="text-sm text-muted-foreground mt-1">Developer Admin Panel</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-[11px] text-muted-foreground font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            {DEV_KIT_VERSION}
          </div>
        </div>

        {/* Biometric unlock screen */}
        {showBiometricScreen && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-5">
            <div className="text-center space-y-3">
              <div
                onClick={!biometricAuthenticating ? handleBiometricUnlock : undefined}
                className={cn(
                  'inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto cursor-pointer transition-all duration-200',
                  biometricAuthenticating
                    ? 'bg-primary/20 text-primary animate-pulse scale-105'
                    : biometricFailed
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105'
                )}
              >
                <BiometricIcon className="w-9 h-9" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {biometricAuthenticating
                    ? 'Authenticating…'
                    : biometricFailed
                    ? 'Authentication failed'
                    : biometricMode === 'native'
                    ? 'Use biometrics to unlock'
                    : 'Use platform authenticator to unlock'}
                </p>
                {rememberedEmail && (
                  <p className="text-xs text-muted-foreground mt-1">{rememberedEmail}</p>
                )}
              </div>
            </div>
            {biometricFailed && (
              <p className="text-xs text-destructive text-center">
                Try again or use your password instead.
              </p>
            )}
            <Button
              onClick={handleBiometricUnlock}
              disabled={biometricAuthenticating}
              className="w-full h-11 font-semibold"
            >
              {biometricAuthenticating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Authenticating…</>
              ) : biometricFailed ? (
                <><BiometricIcon className="w-4 h-4 mr-2" />Try Again</>
              ) : (
                <><BiometricIcon className="w-4 h-4 mr-2" />Unlock with Biometrics</>
              )}
            </Button>
            <button
              onClick={() => setShowFullForm(true)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Use password instead
            </button>
          </div>
        )}

        {/* Main login form */}
        {(showFullForm || (!showBiometricScreen && biometricMode !== 'checking')) && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
            {isLockedOut && lockoutSecondsLeft !== null && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center space-y-1">
                <p className="font-semibold text-xs">Too many attempts — temporarily locked</p>
                <p className="font-mono text-lg font-bold tabular-nums">{formatLockoutTime(lockoutSecondsLeft)}</p>
                <p className="text-[10px] opacity-70">Try again when the timer expires</p>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Admin email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                  disabled={isVerifying || isLockedOut}
                  autoFocus
                  autoComplete="username"
                  className={cn(
                    'h-11',
                    loginError && 'border-destructive ring-1 ring-destructive/20'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Dev-kit password</label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="DEV_KIT_PASSWORD secret"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setLoginError(null); }}
                    disabled={isVerifying || isLockedOut}
                    autoComplete="off"
                    className={cn(
                      'h-11 pr-10',
                      loginError && 'border-destructive ring-1 ring-destructive/20'
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && (
                <p className="text-xs text-destructive font-medium pl-0.5">{loginError}</p>
              )}

              {/* Remember this device */}
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    rememberMe
                      ? 'bg-primary border-primary'
                      : 'border-border bg-background group-hover:border-primary/50'
                  )}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Remember this device for 30 days
                </span>
              </label>

              <Button
                type="submit"
                disabled={isVerifying || isLockedOut || !email.trim() || !pw.trim()}
                className="w-full h-11 font-semibold"
              >
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
                ) : isLockedOut ? (
                  `Locked — ${formatLockoutTime(lockoutSecondsLeft!)}`
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />Unlock admin panel</>
                )}
              </Button>
            </form>
            <p className="text-center text-[10px] text-muted-foreground">
              Admin access only · Powered by Supabase Edge Functions
            </p>
          </div>
        )}

        {/* Checking state */}
        {biometricMode === 'checking' && hasRememberedSession && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking session…</span>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to app
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Inner (manages both login and dashboard) ----------

function DevToolsInner() {
  const { isUnlocked, lock } = useDevKitSession();

  const [activeTab, setActiveTab] = useState<Tab>('mission');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const navigate = useNavigate();

  const checkConnection = useCallback(async () => {
    try {
      const { error } = await edgeFunctions.functions.invoke('me', { body: {} });
      if (!error) {
        setConnectionStatus('connected');
      } else {
        const err = error as { status?: number; message?: string };
        const msg = (err.message ?? '').toLowerCase();
        const isNetworkError = !err.status && (
          msg.includes('failed to fetch') ||
          msg.includes('networkerror') ||
          msg.includes('network request failed') ||
          msg.includes('load failed')
        );
        if (isNetworkError) {
          setConnectionStatus('disconnected');
        } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('degraded');
        }
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    checkConnection();
    const interval = setInterval(checkConnection, 30_000);
    return () => clearInterval(interval);
  }, [isUnlocked, checkConnection]);

  const handleLock = () => {
    lock();
    setActiveTab('mission');
    setUserCount(null);
    setCouponCount(null);
    setConnectionStatus('checking');
  };

  if (!isUnlocked) {
    return <DevKitLoginForm />;
  }

  return (
    <div id="dev-tools-root" className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col bg-zinc-950 border-r border-white/[0.06] h-full overflow-y-auto">
        {/* Logo / product name */}
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-none">DevKit</p>
              <p className="text-[10px] text-white/30 mt-0.5">WiseResume Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 px-2 py-4 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-2 mb-1.5">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  let badge: number | null = null;
                  if (item.id === 'users' && userCount !== null) badge = userCount;
                  if (item.id === 'coupons' && couponCount !== null) badge = couponCount;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-white/40')} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badge !== null && (
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                          isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                        )}>
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: version + lock + back */}
        <div className="px-2 py-4 border-t border-white/[0.06] space-y-1">
          <div className="px-2.5 pb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              {DEV_KIT_VERSION}
            </span>
          </div>
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Lock session
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            Back to app
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">DevKit</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{TAB_LABELS[activeTab]}</span>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionPill status={connectionStatus} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLock}
              className="flex items-center gap-1.5 h-8 text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-5xl">

            <DevKitPanelBoundary key={activeTab} panelName={TAB_LABELS[activeTab]}>
              {activeTab === 'mission' && (
                <MissionControlPanel onNavigate={(tab) => setActiveTab(tab as Tab)} />
              )}

              {activeTab === 'overview' && (
                <OverviewPanel />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsPanel />
              )}

              {activeTab === 'onboarding' && (
                <OnboardingFunnelPanel />
              )}

              {activeTab === 'live' && (
                <LiveActivityPanel />
              )}

              {activeTab === 'deployment' && (
                <DeploymentPanel />
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      User Management
                      {userCount !== null && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">({userCount} total)</span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      View all registered users. Click any row to manage — set plans, grant trials, suspend accounts, adjust credits, and add admin notes.
                    </p>
                  </div>
                  <AdminUsersPanel onCountChange={setUserCount} />
                </div>
              )}

              {activeTab === 'coupons' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Tag className="w-5 h-5 text-primary" />
                      Coupon Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Create and manage discount codes. Users can redeem codes on the subscription page to get free plan upgrades or discounts.
                    </p>
                  </div>
                  <CouponsPanel onCountChange={setCouponCount} />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" />
                      App Settings
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Control app-wide settings. Toggle maintenance mode, post announcements, enable or disable features, and manage AI credit limits for all users.
                    </p>
                  </div>
                  <AppSettingsPanel />
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Email Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      View unconfirmed users, send magic links, OTPs, password resets, and custom one-off emails to any user.
                    </p>
                  </div>
                  <EmailManagementPanel />
                </div>
              )}

              {activeTab === 'wisehire' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      WiseHire Waitlist
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      View everyone who signed up for early access. Send invite emails directly from here — each invite generates a signed 72-hour link.
                    </p>
                  </div>
                  <WiseHireWaitlistPanel />
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Portfolio Usernames</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage the public portfolio username namespace: directory of active usernames, global rules, reserved words, and exclusive assignments.
                    </p>
                  </div>
                  <PortfolioUsernamesPanel />
                </div>
              )}

              {activeTab === 'owner-ops' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-primary" />
                      Owner Operations
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      App-wide communications and operational controls: in-app broadcasts, email campaigns, scheduled maintenance windows, and database backup triggers.
                    </p>
                  </div>
                  <OwnerOpsPanel />
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Admin Activity Log
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      A record of all admin actions — plan changes, trial grants, suspensions, credit overrides, and coupon redemptions.
                    </p>
                  </div>
                  <AuditLogPanel />
                </div>
              )}

              {activeTab === 'openrouter' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      OpenRouter
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Inspect and smoke-test the three OpenRouter keys backing the AI engine. Raw key values stay on the server — only the last 4 characters are shown.
                    </p>
                  </div>
                  <OpenRouterPanel />
                </div>
              )}

              {activeTab === 'groq' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      Groq
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Inspect and smoke-test the three Groq keys backing the AI engine. Raw key values stay on the server — only the last 4 characters are shown.
                    </p>
                  </div>
                  <GroqPanel />
                </div>
              )}

              {activeTab === 'flags' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Flag className="w-5 h-5 text-primary" />
                      Feature Flags
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Toggle features on/off for specific plans, individual users, or a percentage rollout — no code deploy needed. Enable a kill switch to instantly disable a broken edge function.
                    </p>
                  </div>
                  <FeatureFlagsPanel />
                </div>
              )}

              {activeTab === 'ai-routing' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      AI Routing
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Control which AI provider handles each feature, configure per-plan daily credit caps, and set up A/B splits to test providers against each other — all without a code deploy.
                    </p>
                  </div>
                  <AIRoutingPanel />
                </div>
              )}

              {activeTab === 'observability' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Telescope className="w-5 h-5 text-primary" />
                      Observability
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Real-time latency, error rates, and request volume for every edge function — plus a live error stream with full context and review workflow.
                    </p>
                  </div>
                  <ObservabilityPanel />
                </div>
              )}

              {activeTab === 'moderation' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-primary" />
                      Moderation
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Review and triage bug reports, manage the blocklist to block abusive accounts at login, and process flagged content from the moderation queue.
                    </p>
                  </div>
                  <ModerationPanel />
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Plug className="w-5 h-5 text-primary" />
                      Integrations
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Monitor Kinde auth events, inspect Resend email bounce reports, and trigger or review GitHub Actions deploy runs — all without leaving the DevKit.
                    </p>
                  </div>
                  <IntegrationsPanel />
                </div>
              )}

            </DevKitPanelBoundary>

          </div>
        </main>
      </div>
    </div>
  );
}

export default function DevToolsPage() {
  return (
    <DevKitSessionProvider>
      <DevToolsInner />
    </DevKitSessionProvider>
  );
}
