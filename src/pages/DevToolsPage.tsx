import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  BrainCircuit,
  CheckCircle2,
  Cog,
  Database,
  Fingerprint,
  Flag,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  Lock,
  Mail,
  Menu,
  Play,
  Route,
  ServerCog,
  ShieldCheck,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DevKitSessionProvider,
  useDevKitSession,
  loadRememberedToken,
  isBiometricAvailable,
  hasBiometricCredential,
  registerBiometricCredential,
  verifyBiometricCredential,
} from '@/contexts/DevKitSessionContext';
import { devKitLogin } from '@/lib/devkit/devKitClient';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AIRadarPanel } from '@/components/dev-kit/AIRadarPanel';
import { DatabaseXRay } from '@/components/dev-kit/DatabaseXRay';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { AIKeysPanel } from '@/components/dev-kit/AIKeysPanel';
import { AIRoutingSwitcher } from '@/components/dev-kit/AIRoutingSwitcher';
import { PortfolioUsernamesPanel } from '@/components/dev-kit/PortfolioUsernamesPanel';
import { DiagnosticsPanel } from '@/components/dev-kit/DiagnosticsPanel';
import { MissionControlPanel } from '@/components/dev-kit/MissionControlPanel';
import { ObservabilityPanel } from '@/components/dev-kit/ObservabilityPanel';
import { LiveActivityPanel } from '@/components/dev-kit/LiveActivityPanel';
import { FeatureFlagsPanel } from '@/components/dev-kit/FeatureFlagsPanel';
import { EmailManagementPanel } from '@/components/dev-kit/EmailManagementPanel';
import { TestmailInboxPanel } from '@/components/dev-kit/TestmailInboxPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { DevKitRunner } from '@/components/dev-kit/DevKitRunner';

type PanelStatus = 'Live' | 'Needs Appwrite Function' | 'Needs Schema' | 'Planned';

interface PanelDef {
  id: string;
  title: string;
  icon: React.ElementType;
  status: PanelStatus;
}

const PANEL_GROUPS: { label: string; panels: PanelDef[] }[] = [
  {
    label: 'Operations Hub',
    panels: [
      { id: 'diagnostics', title: 'Diagnostics', icon: ServerCog, status: 'Live' },
      { id: 'mission', title: 'Mission Control', icon: Activity, status: 'Live' },
      { id: 'observability', title: 'Observability', icon: BarChart2, status: 'Needs Schema' },
      { id: 'live', title: 'Live Activity', icon: Zap, status: 'Needs Schema' },
      { id: 'runner', title: 'Smoke Runner', icon: Play, status: 'Live' },
    ],
  },
  {
    label: 'Command Center',
    panels: [
      { id: 'overview', title: 'Infrastructure', icon: LayoutDashboard, status: 'Live' },
      { id: 'users', title: 'God Mode (Users)', icon: Users, status: 'Live' },
      { id: 'db', title: 'Database X-Ray', icon: Database, status: 'Live' },
      { id: 'flags', title: 'Feature Control', icon: Flag, status: 'Needs Appwrite Function' },
    ],
  },
  {
    label: 'AI Command Center',
    panels: [
      { id: 'ai', title: 'AI Radar', icon: BrainCircuit, status: 'Live' },
      { id: 'ai-keys', title: 'AI Keys', icon: KeyRound, status: 'Live' },
      { id: 'ai-routing', title: 'AI Master Switch', icon: Route, status: 'Live' },
    ],
  },
  {
    label: 'Support & Business Ops',
    panels: [
      { id: 'email', title: 'Email Center', icon: Mail, status: 'Needs Appwrite Function' },
      { id: 'testmail', title: 'Testmail Inbox', icon: Inbox, status: 'Needs Appwrite Function' },
      { id: 'coupons', title: 'Coupons', icon: Ticket, status: 'Live' },
      { id: 'portfolios', title: 'Portfolios', icon: Link2, status: 'Live' },
      { id: 'audit', title: 'History', icon: History, status: 'Live' },
      { id: 'settings', title: 'Core Settings', icon: ShieldCheck, status: 'Live' },
    ],
  },
];

const STATUS_CLASSES: Record<PanelStatus, string> = {
  Live: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  'Needs Appwrite Function': 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  'Needs Schema': 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  Planned: 'border-white/10 bg-white/5 text-white/35',
};

function statusShort(status: PanelStatus) {
  if (status === 'Needs Appwrite Function') return 'Function';
  if (status === 'Needs Schema') return 'Schema';
  return status;
}

export default function DevToolsPage() {
  return (
    <DevKitSessionProvider>
      <DevToolsInner />
    </DevKitSessionProvider>
  );
}

function DevToolsInner() {
  const navigate = useNavigate();
  const { isUnlocked, unlock, lock, hasRememberedSession, secondsUntilLock } = useDevKitSession();

  const [activePanel, setActivePanel] = useState('diagnostics');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [hasCred, setHasCred] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(ok => {
      setBiometricReady(ok);
      setHasCred(hasBiometricCredential());
    });
  }, []);

  useEffect(() => {
    if (!isUnlocked) setHasCred(hasBiometricCredential());
  }, [isUnlocked]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const result = await devKitLogin(password);
      if (!result.success) {
        toast.error(result.code === 'CONFIG_MISSING' ? 'DevKit auth is not configured on Appwrite.' : 'Access denied.');
        return;
      }

      unlock(result.session.token, {
        rememberMe: true,
        expiresAt: new Date(result.session.expiresAt).getTime(),
        email: result.session.email ?? 'admin@thewise.cloud',
      });
      setPassword('');
      toast.success('Access granted. DevKit session issued by Appwrite.');

      if (biometricReady && !hasBiometricCredential()) {
        const registered = await registerBiometricCredential();
        if (registered) {
          setHasCred(true);
          toast.success('Biometric shortcut registered for this device.', { duration: 4000 });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'DevKit login failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const verified = await verifyBiometricCredential();
      if (!verified) {
        toast.error('Biometric verification failed or was cancelled.');
        return;
      }
      const remembered = loadRememberedToken();
      if (!remembered) {
        toast.error('DevKit session expired. Please enter your password.');
        return;
      }
      unlock(remembered.token);
      toast.success('Biometric access granted.');
    } catch {
      toast.error('Biometric error. Please use your password instead.');
    } finally {
      setIsVerifying(false);
    }
  };

  const navigatePanel = (id: string) => {
    const aliases: Record<string, string> = {
      deployment: 'diagnostics',
      openrouter: 'ai-keys',
      visitors: 'live',
      email: 'email',
      overview: 'overview',
      live: 'live',
    };
    setActivePanel(aliases[id] ?? id);
    setIsMobileMenuOpen(false);
  };

  const renderPanel = () => {
    const wrap = (name: string, node: React.ReactNode) => (
      <DevKitPanelBoundary panelName={name}>{node}</DevKitPanelBoundary>
    );
    switch (activePanel) {
      case 'diagnostics': return wrap('Diagnostics', <DiagnosticsPanel />);
      case 'mission': return wrap('Mission Control', <MissionControlPanel onNavigate={navigatePanel} />);
      case 'observability': return wrap('Observability', <ObservabilityPanel />);
      case 'live': return wrap('Live Activity', <LiveActivityPanel />);
      case 'runner': return wrap('Smoke Runner', <DevKitRunner />);
      case 'overview': return wrap('Infrastructure', <OverviewPanel />);
      case 'users': return wrap('God Mode', <AdminUsersPanel />);
      case 'db': return wrap('Database X-Ray', <DatabaseXRay />);
      case 'flags': return wrap('Feature Control', <FeatureFlagsPanel />);
      case 'ai': return wrap('AI Radar', <AIRadarPanel />);
      case 'ai-keys': return wrap('AI Keys', <AIKeysPanel />);
      case 'ai-routing': return wrap('AI Master Switch', <AIRoutingSwitcher />);
      case 'email': return wrap('Email Center', <EmailManagementPanel />);
      case 'testmail': return wrap('Testmail Inbox', <TestmailInboxPanel />);
      case 'coupons': return wrap('Coupons', <CouponsPanel />);
      case 'portfolios': return wrap('Portfolios', <PortfolioUsernamesPanel />);
      case 'audit': return wrap('History', <AuditLogPanel />);
      case 'settings': return wrap('Core Settings', <AppSettingsPanel />);
      default: return wrap('Diagnostics', <DiagnosticsPanel />);
    }
  };

  const canUseBiometric = biometricReady && hasCred && hasRememberedSession;

  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            {canUseBiometric ? (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isVerifying}
                className="mb-4 inline-flex rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 transition-all hover:bg-blue-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label="Unlock with biometrics"
              >
                {isVerifying
                  ? <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  : <Fingerprint className="h-10 w-10 text-blue-500" />}
              </button>
            ) : (
              <div className="mb-4 inline-flex rounded-3xl border border-white/10 bg-white/5 p-4">
                <Lock className="h-10 w-10 text-white/30" />
              </div>
            )}
            <h1 className="text-3xl font-black tracking-tight text-white">DEV-KIT 2026</h1>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Server-issued admin session required
            </p>
          </div>

          {canUseBiometric && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isVerifying}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-sm font-bold text-blue-400 transition-all hover:bg-blue-500/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              {isVerifying ? 'Verifying...' : 'Unlock with Face ID / Touch ID / PIN'}
            </button>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {canUseBiometric && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/30">or password</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            )}
            <div className="group relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-white/20 transition-colors group-focus-within:text-blue-500" />
              <input
                type="password"
                placeholder="DevKit access key"
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 font-mono text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus={!canUseBiometric}
              />
            </div>
            <Button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="h-14 w-full rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500"
            >
              {isVerifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Issue DevKit Session
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const activeDef = PANEL_GROUPS.flatMap(g => g.panels).find(p => p.id === activePanel)
    ?? PANEL_GROUPS[0].panels[0];

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#050505] text-white lg:flex-row">
      <div className="flex items-center justify-between border-b border-white/5 bg-black p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <Cog size={18} className="text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter">DEV-KIT</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      <aside className={cn(
        'fixed inset-0 z-50 flex w-full flex-col border-r border-white/5 bg-black/90 backdrop-blur-xl transition-all duration-300 lg:static lg:w-80 lg:translate-x-0 lg:bg-black/50',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="hidden items-center justify-between border-b border-white/5 p-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
              <Cog size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">DEV-KIT</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
            <ArrowLeft size={20} />
          </Button>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto p-4">
          {PANEL_GROUPS.map(group => (
            <div key={group.label} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-white/30">{group.label}</h3>
              <div className="space-y-1">
                {group.panels.map(panel => (
                  <button
                    key={panel.id}
                    onClick={() => navigatePanel(panel.id)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all',
                      activePanel === panel.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <panel.icon
                      size={18}
                      className={cn(activePanel === panel.id ? 'text-white' : 'text-white/20 group-hover:text-white/40')}
                    />
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{panel.title}</span>
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase', STATUS_CLASSES[panel.status])}>
                      {statusShort(panel.status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/5 p-4">
          {secondsUntilLock !== null && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-white/35">
              Auto-lock in {Math.ceil(secondsUntilLock / 60)}m
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start rounded-2xl text-red-400 hover:bg-red-400/10 hover:text-red-300"
            onClick={lock}
          >
            <Lock size={18} className="mr-3" /> Terminate Session
          </Button>
        </div>
      </aside>

      <main className="h-full flex-1 overflow-y-auto bg-black/20">
        <div className="mx-auto max-w-6xl p-4 lg:p-12">
          <header className="mb-8 flex flex-col justify-between gap-6 lg:mb-12 md:flex-row md:items-end">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tighter lg:text-4xl">{activeDef.title}</h1>
                <span className={cn('rounded-full border px-2 py-1 text-[10px] font-black uppercase', STATUS_CLASSES[activeDef.status])}>
                  {activeDef.status}
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Operations Hub / {activePanel}
              </p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-500">Diagnostics Enabled</span>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
