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
  Rocket,
  Mail,
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
import { LiveActivityPanel } from '@/components/dev-kit/LiveActivityPanel';
import { DeploymentPanel } from '@/components/dev-kit/DeploymentPanel';
import { EmailManagementPanel } from '@/components/dev-kit/EmailManagementPanel';
import { DEV_KIT_VERSION } from '@/components/dev-kit/config';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { DevKitSessionProvider, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'analytics' | 'live' | 'deployment' | 'users' | 'coupons' | 'settings' | 'activity' | 'email';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'live', label: 'Live Activity', icon: Activity },
  { id: 'deployment', label: 'Deployment', icon: Rocket },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'activity', label: 'Audit Log', icon: Clock },
];

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

function DevToolsInner() {
  const { isUnlocked, unlock, lock } = useDevKitSession();
  const unlocked = isUnlocked;

  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const navigate = useNavigate();

  const checkConnection = useCallback(async () => {
    try {
      const { error } = await supabase.from('resumes').select('id').limit(1);
      setConnectionStatus(error ? 'disconnected' : 'connected');
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
    if (!pw.trim()) return;

    setIsVerifying(true);
    setPwError(false);

    const submittedPw = pw;
    setPw('');

    try {
      const { data, error } = await edgeFunctions.functions.invoke('verify-dev-kit', {
        body: { password: submittedPw },
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
        unlock(data.token as string);
      } else {
        setPwError(true);
      }
    } catch {
      toast.error('System error during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    lock();
    setPw('');
    setPwError(false);
    setActiveTab('overview');
    setUserCount(null);
    setCouponCount(null);
    setConnectionStatus('checking');
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10 mx-auto">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">WiseResume</h1>
              <p className="text-sm text-muted-foreground">Developer Admin Panel</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-[11px] text-muted-foreground font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {DEV_KIT_VERSION}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5 space-y-4">
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Admin password</label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your dev-kit password"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setPwError(false); }}
                    disabled={isVerifying}
                    autoFocus
                    className={cn(
                      'h-11 pr-10 bg-background/70',
                      pwError && 'border-destructive ring-1 ring-destructive/30'
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
                {pwError && (
                  <p className="text-xs text-destructive font-medium pl-0.5">
                    Incorrect password — try again
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isVerifying || !pw.trim()}
                className="w-full h-11 font-semibold"
              >
                {isVerifying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
                ) : (
                  'Unlock admin panel'
                )}
              </Button>
            </form>
            <p className="text-center text-[10px] text-muted-foreground/50">
              Admin access only · Powered by Supabase Edge Functions
            </p>
          </div>

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

  return (
    <div className="min-h-screen bg-background/40 backdrop-blur-sm relative z-10">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-5">

        {/* Header */}
        <header className="flex items-center justify-between sticky top-0 py-3 bg-background/95 backdrop-blur-md z-40 px-3 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">Developer Admin</h1>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
                  {DEV_KIT_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">WiseResume internal dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              {connectionStatus === 'checking' && (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Checking…</>
              )}
              {connectionStatus === 'connected' && (
                <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />Connected</>
              )}
              {connectionStatus === 'disconnected' && (
                <><span className="w-2 h-2 rounded-full bg-destructive inline-block" />Offline</>
              )}
            </div>

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

        {/* Tab navigation */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit min-w-full sm:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let badge: number | null = null;
              if (tab.id === 'users' && userCount !== null) badge = userCount;
              if (tab.id === 'coupons' && couponCount !== null) badge = couponCount;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary')} />
                  <span>{tab.label}</span>
                  {badge !== null && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                      isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6">

            {activeTab === 'overview' && (
              <OverviewPanel />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsPanel />
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

          </div>
        </div>

        <footer className="py-6 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground/50 font-mono">
            {DEV_KIT_VERSION} · Build {new Date().toISOString().split('T')[0].replace(/-/g, '')}
          </p>
          <p className="text-[10px] text-muted-foreground/30 mt-0.5">
            Secrets (DEV_KIT_PASSWORD, GITHUB_TOKEN, etc.) must be set in Supabase → Edge Functions → Secrets
          </p>
        </footer>
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
