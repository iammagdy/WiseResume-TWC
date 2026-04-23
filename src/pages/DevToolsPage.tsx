import React, { useState, useEffect, useCallback } from 'react';
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
import { DEV_KIT_VERSION } from '@/components/dev-kit/config';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { DevKitSessionProvider, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';

type Tab = 'overview' | 'analytics' | 'onboarding' | 'live' | 'deployment' | 'users' | 'coupons' | 'settings' | 'activity' | 'email' | 'wisehire' | 'portfolio' | 'openrouter' | 'groq';

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
      { id: 'coupons', label: 'Coupons', icon: Tag },
      { id: 'wisehire', label: 'WiseHire', icon: Briefcase },
      { id: 'portfolio', label: 'Portfolio', icon: AtSign },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'deployment', label: 'Deployment', icon: Rocket },
      { id: 'openrouter', label: 'OpenRouter', icon: BrainCircuit },
      { id: 'groq', label: 'Groq', icon: BrainCircuit },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'activity', label: 'Audit Log', icon: Clock },
    ],
  },
];

const TAB_LABELS: Record<Tab, string> = {
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

function DevToolsInner() {
  const { isUnlocked, unlock, lock } = useDevKitSession();
  const unlocked = isUnlocked;

  const [email, setEmail] = useState('');
  const [supabasePw, setSupabasePw] = useState('');
  const [showSupabasePw, setShowSupabasePw] = useState(false);
  const [pw, setPw] = useState('');
  const [totp, setTotp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  // Track whether the DevKit flow itself performed the Supabase sign-in so we
  // can sign out on lock, keeping the session genuinely temporary.
  const devKitSignedInRef = React.useRef(false);

  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number | null>(null);
  const lockoutIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockoutCountdown = React.useCallback((seconds: number) => {
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

  React.useEffect(() => {
    return () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    };
  }, []);

  const isLockedOut = lockoutSecondsLeft !== null && lockoutSecondsLeft > 0;

  const formatLockoutTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
  };

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
    if (!unlocked) return;
    checkConnection();
    const interval = setInterval(checkConnection, 30_000);
    return () => clearInterval(interval);
  }, [unlocked, checkConnection]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !supabasePw.trim() || !pw.trim() || totp.trim().length !== 6 || isLockedOut) return;

    setIsVerifying(true);
    setLoginError(null);

    const submittedEmail = email.trim();
    const submittedSupabasePw = supabasePw;
    const submittedPw = pw;
    const submittedTotp = totp.trim();
    setSupabasePw('');
    setPw('');
    setTotp('');

    try {
      // Step 1: Ensure we have a Supabase session. If the admin is not signed
      // into the main app, sign them in with their Supabase account password so
      // that DevKit works as a fully standalone page.
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: submittedEmail,
          password: submittedSupabasePw,
        });
        if (signInError) {
          const msg = signInError.message ?? '';
          if (msg.toLowerCase().includes('invalid login credentials')) {
            setLoginError('Incorrect email or account password.');
          } else if (msg.toLowerCase().includes('email not confirmed')) {
            setLoginError('Email not confirmed — check your inbox.');
          } else {
            setLoginError('Sign-in failed — check your account credentials and try again.');
          }
          return;
        }
        const { data: freshSession } = await supabase.auth.getSession();
        sessionData = freshSession;
        devKitSignedInRef.current = true;
      }

      // Step 2: Step the Supabase session up to AAL2 by completing an MFA
      // challenge against the user's enrolled TOTP factor. verify-dev-kit
      // refuses to mint a DevKit token unless the access token presents
      // `aal: aal2`.
      const aalRes = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalRes.error) {
        setLoginError('Could not read MFA state — try again.');
        return;
      }

      if (aalRes.data?.currentLevel !== 'aal2') {
        const factorsRes = await supabase.auth.mfa.listFactors();
        if (factorsRes.error) {
          setLoginError('Could not list MFA factors — try again.');
          return;
        }
        const totpFactor = factorsRes.data?.totp?.find((f) => f.status === 'verified');
        if (!totpFactor) {
          setLoginError('Enroll a TOTP authenticator on your Supabase account before opening the DevKit.');
          return;
        }
        const verifyRes = await supabase.auth.mfa.challengeAndVerify({
          factorId: totpFactor.id,
          code: submittedTotp,
        });
        if (verifyRes.error) {
          setLoginError('Invalid authenticator code — try again.');
          return;
        }
      }

      // Step 3: Retrieve the stepped-up (AAL2) access token and pass it
      // explicitly to verify-dev-kit so the edge function can validate the
      // AAL2 claim. Without this the proxy would send the bridge token, which
      // does not carry aal2 and would cause the function to reject the call.
      const { data: aal2Session } = await supabase.auth.getSession();
      const aal2AccessToken = aal2Session?.session?.access_token ?? null;
      if (!aal2AccessToken) {
        setLoginError('Could not retrieve session token — try again.');
        return;
      }

      const { data, error } = await edgeFunctions.functions.invoke('verify-dev-kit', {
        body: { email: submittedEmail, password: submittedPw },
        headers: { Authorization: `Bearer ${aal2AccessToken}` },
      });

      if (error) {
        if (error.message?.includes('Failed to fetch') || error.status === 404) {
          toast.error('Verification Function Not Found', {
            description: 'Please deploy the "verify-dev-kit" Edge Function to your Supabase project.',
            duration: 6000,
          });
        } else {
          toast.error('Verification failed: ' + error.message);
        }
        return;
      }

      if (data?.success && data?.token) {
        setLockoutSecondsLeft(null);
        unlock(data.token as string);
      } else if (data?.locked) {
        const retryAfter = (data.retry_after_seconds as number) ?? 600;
        startLockoutCountdown(retryAfter);
        setLoginError(null);
      } else if (data?.authorized === false) {
        setLoginError('This email is not authorised for admin access.');
      } else if (data?.reason === 'mfa_required') {
        setLoginError('MFA challenge required — re-enter your authenticator code.');
      } else if (data?.reason === 'email_mismatch') {
        setLoginError('DevKit email must match your signed-in Supabase account.');
      } else if (data?.reason === 'invalid_session') {
        setLoginError('Session could not be validated — try again.');
      } else {
        setLoginError('Incorrect email, password, or code — try again.');
      }
    } catch {
      toast.error('System error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    // Sign out of the temporary Supabase session if DevKit created it, so
    // the session does not persist beyond the DevKit flow.
    if (devKitSignedInRef.current) {
      devKitSignedInRef.current = false;
      supabase.auth.signOut().catch(() => { /* best-effort */ });
    }
    lock();
    setEmail('');
    setSupabasePw('');
    setPw('');
    setTotp('');
    setLoginError(null);
    setActiveTab('overview');
    setUserCount(null);
    setCouponCount(null);
    setConnectionStatus('checking');
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mx-auto">
              <Lock className="w-7 h-7 text-white/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">WiseResume</h1>
              <p className="text-sm text-white/40 mt-1">Developer Admin Panel</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/40 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
              {DEV_KIT_VERSION}
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 backdrop-blur-sm">
            {isLockedOut && lockoutSecondsLeft !== null && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center space-y-1">
                <p className="font-semibold text-xs">Too many attempts — temporarily locked</p>
                <p className="font-mono text-lg font-bold tabular-nums">{formatLockoutTime(lockoutSecondsLeft)}</p>
                <p className="text-[10px] opacity-70">Try again when the timer expires</p>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Admin email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginError(null); }}
                  disabled={isVerifying || isLockedOut}
                  autoFocus
                  autoComplete="username"
                  className={cn(
                    'h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10',
                    loginError && 'border-red-500/50 ring-1 ring-red-500/20'
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Account password</label>
                <div className="relative">
                  <Input
                    type={showSupabasePw ? 'text' : 'password'}
                    placeholder="Your Supabase account password"
                    value={supabasePw}
                    onChange={(e) => { setSupabasePw(e.target.value); setLoginError(null); }}
                    disabled={isVerifying || isLockedOut}
                    autoComplete="current-password"
                    className={cn(
                      'h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10',
                      loginError && 'border-red-500/50 ring-1 ring-red-500/20'
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => setShowSupabasePw(!showSupabasePw)}
                    tabIndex={-1}
                  >
                    {showSupabasePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Dev-kit password</label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="DEV_KIT_PASSWORD secret"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setLoginError(null); }}
                    disabled={isVerifying || isLockedOut}
                    autoComplete="off"
                    className={cn(
                      'h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10',
                      loginError && 'border-red-500/50 ring-1 ring-red-500/20'
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => setShowPw(!showPw)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginError && (
                  <p className="text-xs text-red-400 font-medium pl-0.5">
                    {loginError}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Authenticator code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  value={totp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTotp(v);
                    setLoginError(null);
                  }}
                  disabled={isVerifying || isLockedOut}
                  autoComplete="one-time-code"
                  className={cn(
                    'h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-white/30 focus:ring-white/10 font-mono tracking-widest text-center',
                    loginError && 'border-red-500/50 ring-1 ring-red-500/20'
                  )}
                />
                <p className="text-[10px] text-white/30 pl-0.5">6-digit code from your authenticator app</p>
              </div>
              <Button
                type="submit"
                disabled={isVerifying || isLockedOut || !email.trim() || !supabasePw.trim() || !pw.trim() || totp.trim().length !== 6}
                className="w-full h-11 font-semibold bg-white text-zinc-950 hover:bg-white/90"
              >
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
                ) : isLockedOut ? (
                  `Locked — ${formatLockoutTime(lockoutSecondsLeft!)}`
                ) : (
                  'Unlock admin panel'
                )}
              </Button>
            </form>
            <p className="text-center text-[10px] text-white/20">
              Admin access only · Powered by Supabase Edge Functions
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate(-1)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors inline-flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to app
            </button>
          </div>
        </div>
      </div>
    );
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
