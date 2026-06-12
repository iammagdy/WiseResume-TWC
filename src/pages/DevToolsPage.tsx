import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { ArrowLeft, CheckCircle2, Cog, Lock, Menu, Search, ShieldCheck, Wrench, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DevKitSessionProvider, useDevKitSession } from '@/contexts/DevKitSessionContext';
import { devKitLogin, devKitCall } from '@/lib/devkit/devKitClient';
import { useAuth } from '@/hooks/useAuth';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { AICommandCenterPanel } from '@/components/dev-kit/AICommandCenterPanel';
import { DatabaseXRay } from '@/components/dev-kit/DatabaseXRay';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { PortfolioUsernamesPanel } from '@/components/dev-kit/PortfolioUsernamesPanel';
import { DiagnosticsPanel } from '@/components/dev-kit/DiagnosticsPanel';
import { MissionControlPanel } from '@/components/dev-kit/MissionControlPanel';
import { DevKitRunner } from '@/components/dev-kit/DevKitRunner';
import { ObservabilityPanel } from '@/components/dev-kit/ObservabilityPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { FeatureFlagsPanel } from '@/components/dev-kit/FeatureFlagsPanel';
import { ModerationPanel } from '@/components/dev-kit/ModerationPanel';
import { EmailHubPanel } from '@/components/dev-kit/EmailHubPanel';
import { GrowthTrafficPanel } from '@/components/dev-kit/GrowthTrafficPanel';
import { WiseHireWaitlistPanel } from '@/components/dev-kit/WiseHireWaitlistPanel';
import { HomePanel } from '@/components/dev-kit/HomePanel';
import { DeployHubsPanel } from '@/components/dev-kit/DeployHubsPanel';
import { AIKeysPanel } from '@/components/dev-kit/AIKeysPanel';
import { AIRoutingSwitcher } from '@/components/dev-kit/AIRoutingSwitcher';
import { AIRadarPanel } from '@/components/dev-kit/AIRadarPanel';
import { PANEL_GROUPS, DEVTOOLS_PANEL_ALIASES, allPanels, groupForPanel, statusShort, type PanelDef, type PanelStatus } from '@/lib/devkit/devToolsPanelConfig';

const STATUS_CLASSES: Record<PanelStatus, string> = {
  Live: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  'Needs Appwrite Function': 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  'Needs Schema': 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  Planned: 'border-white/10 bg-white/5 text-white/35',
};

function NotReadyPanel({ panel }: { panel: PanelDef }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <panel.icon className="h-6 w-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-black text-white">{panel.title}</h2>
          <p className="text-xs text-white/45">This surface is visible in the DevKit but intentionally blocked from executing until its backend prerequisites are ready.</p>
        </div>
      </div>
      <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase', STATUS_CLASSES[panel.status])}>{panel.status}</span>
      {panel.blockers && panel.blockers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">Blockers from live Appwrite audit</p>
          {panel.blockers.map(blocker => (
            <div key={blocker} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/65">{blocker}</div>
          ))}
        </div>
      )}
      <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs leading-relaxed text-blue-300">
        The Diagnostics panel remains the source of truth for current deployment, schema, and environment readiness.
      </p>
    </div>
  );
}

export default function DevToolsPage() {
  return <DevKitSessionProvider><DevToolsInner /></DevKitSessionProvider>;
}

function DevToolsInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isUnlocked, unlock, lock, secondsUntilLock } = useDevKitSession();
  const [activePanel, setActivePanel] = useState('home');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [cmdKQuery, setCmdKQuery] = useState('');
  const [cmdKIndex, setCmdKIndex] = useState(0);
  const loginAttemptedRef = useRef(false);

  const requestAdminSession = useCallback(async (force = false) => {
    if (isVerifying || (!force && loginAttemptedRef.current)) return;
    loginAttemptedRef.current = true;
    setIsVerifying(true);
    setUnlockError(null);
    try {
      const result = await devKitLogin();
      if (!result.success) {
        const message = result.code === 'CONFIG_MISSING'
          ? 'DevKit auth is not configured on Appwrite.'
          : (typeof result.error === 'string' && result.error.trim())
            ? result.error
            : 'Access denied. Your Appwrite account needs the admin label (or ADMIN_EMAIL must match on the function).';
        setUnlockError(message);
        toast.error(message);
        return;
      }
      const email = result.session.email ?? user?.email ?? 'admin@thewise.cloud';
      unlock(result.session.token);
      toast.success(`Admin session issued for ${email}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'DevKit login failed.';
      setUnlockError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, unlock, user?.email]);

  useEffect(() => {
    if (isUnlocked) return;
    void requestAdminSession();
  }, [isUnlocked, requestAdminSession]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    if (!isUnlocked) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(o => !o);
        setCmdKQuery('');
        setCmdKIndex(0);
      }
      if (e.key === 'Escape') setCmdKOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isUnlocked]);

  // Fetch sidebar badge counts once the session is unlocked
  useEffect(() => {
    if (!isUnlocked) return;
    devKitCall<{ entries: unknown[]; total: number }>({ action: 'list-wisehire-waitlist' })
      .then(res => {
        if (res.ok && (res.data.total ?? 0) > 0) {
          setBadgeCounts(prev => ({ ...prev, 'wisehire-waitlist': res.data.total }));
        }
      })
      .catch(() => {});
  }, [isUnlocked]);

  const navigatePanel = (id: string) => {
    setActivePanel(DEVTOOLS_PANEL_ALIASES[id] ?? id);
    setIsMobileMenuOpen(false);
  };

  const clearBadge = (panelId: string) => {
    setBadgeCounts(prev => { const n = { ...prev }; delete n[panelId]; return n; });
  };

  const renderPanel = () => {
    const wrap = (name: string, node: React.ReactNode) => <DevKitPanelBoundary panelName={name}>{node}</DevKitPanelBoundary>;
    const panel = allPanels().find(p => p.id === activePanel) ?? allPanels()[0];
    if (panel.status !== 'Live') return wrap(panel.title, <NotReadyPanel panel={panel} />);
    switch (activePanel) {
      case 'home':              return wrap('Home',             <HomePanel onNavigate={navigatePanel} />);
      case 'diagnostics':       return wrap('Diagnostics',      <DiagnosticsPanel />);
      case 'mission':           return wrap('Mission Control',  <MissionControlPanel onNavigate={navigatePanel} />);
      case 'runner':            return wrap('System Test Runner', <DevKitRunner />);
      case 'deploy-hubs':       return wrap('Appwrite Functions', <DeployHubsPanel />);
      case 'observability':     return wrap('Observability',    <ObservabilityPanel />);
      case 'growth':            return wrap('Growth & Traffic', <GrowthTrafficPanel />);
      case 'coupons':           return wrap('Coupons',          <CouponsPanel />);
      case 'overview':          return wrap('Data Integrity',   <OverviewPanel />);
      case 'users':             return wrap('Users',            <AdminUsersPanel />);
      case 'db':                return wrap('Database X-Ray',   <DatabaseXRay />);
      case 'ai-health':         return wrap('AI Health',        <AICommandCenterPanel />);
      case 'ai-tools-map':      return wrap('AI Tools Map',     <AIRoutingSwitcher />);
      case 'ai-radar':          return wrap('AI Radar',         <AIRadarPanel />);
      case 'ai-keys':           return wrap('API Keys',         <AIKeysPanel />);
      case 'flags':             return wrap('Feature Flags',    <FeatureFlagsPanel />);
      case 'moderation':        return wrap('Moderation',       <ModerationPanel />);
      case 'email-hub':         return wrap('Email',            <EmailHubPanel />);
      case 'portfolios':        return wrap('Portfolios',       <PortfolioUsernamesPanel />);
      case 'wisehire-waitlist': return wrap('WiseHire Queue',   <WiseHireWaitlistPanel onBadgeClear={() => clearBadge('wisehire-waitlist')} />);
      case 'audit':             return wrap('Audit Log',        <AuditLogPanel />);
      default:                  return wrap('Mission Control',  <MissionControlPanel onNavigate={navigatePanel} />);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2 text-center">
            <div className="mb-4 inline-flex rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4">
              {isVerifying ? <MiniSpinner size={40} className="text-blue-500" /> : <ShieldCheck className="h-10 w-10 text-blue-500" />}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">DEV-KIT 2026</h1>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Verifying Appwrite admin session
            </p>
            {user?.email && (
              <p className="text-sm text-white/45">
                Signed in as <span className="font-mono text-blue-300">{user.email}</span>
              </p>
            )}
          </div>
          {unlockError ? (
            <div className="space-y-3">
              <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {unlockError}
              </p>
              <Button
                type="button"
                onClick={() => void requestAdminSession(true)}
                disabled={isVerifying}
                className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500"
              >
                {isVerifying ? <MiniSpinner size={18} className="mr-2" /> : null}
                Retry admin verification
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="h-12 w-full rounded-2xl text-white/65 hover:bg-white/10 hover:text-white"
              >
                Back to dashboard
              </Button>
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
              No password is required. Access requires the Appwrite <code className="text-white/60">admin</code> label on your account (or a matching <code className="text-white/60">ADMIN_EMAIL</code> on the function).
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeDef = allPanels().find(p => p.id === activePanel) ?? allPanels()[0];
  const activeGroup = groupForPanel(activePanel);

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#050505] text-white lg:flex-row">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600"><Cog size={18} className="text-white" /></div>
          <span className="text-lg font-black tracking-tighter">DEV-KIT</span>
          {activePanel && <span className="text-sm text-white/40 font-medium truncate max-w-[120px]">{activeDef.title}</span>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</Button>
      </div>

      {/* Sidebar backdrop — tap to close on mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-black/95 backdrop-blur-xl transition-all duration-300 lg:static lg:w-80 lg:translate-x-0 lg:bg-black/50', isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="hidden items-center justify-between border-b border-white/5 p-6 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600"><Cog size={18} className="text-white" /></div>
            <span className="text-xl font-black tracking-tighter">DEV-KIT</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl"><ArrowLeft size={20} /></Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {PANEL_GROUPS.map(group => (
            <div key={group.label} className="space-y-1">
              <h3 className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white/25 flex items-center gap-2">
                {group.label === 'Developer Tools' && <Wrench size={10} className="text-white/20" />}
                {group.label}
              </h3>
              {group.panels.map(panel => {
                const badgeCount = badgeCounts[panel.id] ?? 0;
                const isActive = activePanel === panel.id;
                return (
                  <button
                    key={panel.id}
                    onClick={() => navigatePanel(panel.id)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-all',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <panel.icon
                      size={18}
                      className={cn(isActive ? 'text-white' : 'text-white/20 group-hover:text-white/40')}
                    />
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{panel.title}</span>
                    {badgeCount > 0 ? (
                      <span className="rounded-full bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 min-w-[18px] text-center leading-tight">
                        {badgeCount}
                      </span>
                    ) : (
                      <span className={cn(
                        'rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase',
                        isActive ? 'border-white/20 bg-white/10 text-white' : STATUS_CLASSES[panel.status],
                      )}>
                        {statusShort(panel.status)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/5 p-4">
          {secondsUntilLock !== null && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-white/35">
              Auto-lock in {Math.ceil(secondsUntilLock / 60)}m
            </div>
          )}
          <button
            onClick={() => { setCmdKOpen(true); setCmdKQuery(''); setCmdKIndex(0); }}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[11px] text-white/30 hover:border-white/15 hover:bg-white/5 hover:text-white/50 transition-all"
          >
            <span className="font-medium">Jump to panel…</span>
            <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px]">⌘K</kbd>
          </button>
          <Button variant="ghost" className="w-full justify-start rounded-2xl text-red-400 hover:bg-red-400/10 hover:text-red-300" onClick={lock}>
            <Lock size={18} className="mr-3" /> Terminate Session
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="h-full flex-1 overflow-x-hidden overflow-y-auto bg-black/20">
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
                {activeGroup} / {activeDef.title}
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

      {/* Cmd+K Command Palette */}
      {cmdKOpen && (() => {
        const query = cmdKQuery.toLowerCase().trim();
        const results = PANEL_GROUPS.flatMap(g =>
          g.panels
            .filter(p => p.status === 'Live' && (
              !query ||
              p.title.toLowerCase().includes(query) ||
              g.label.toLowerCase().includes(query)
            ))
            .map(p => ({ ...p, group: g.label }))
        );

        const handleKey = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setCmdKIndex(i => Math.min(i + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setCmdKIndex(i => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') {
            if (results[cmdKIndex]) { navigatePanel(results[cmdKIndex].id); setCmdKOpen(false); }
          }
          else if (e.key === 'Escape') setCmdKOpen(false);
        };

        return (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-6 sm:pt-24 bg-black/60 backdrop-blur-sm px-3 sm:px-0"
            onClick={() => setCmdKOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/80 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
                <Search size={16} className="text-white/30 shrink-0" />
                <input
                  autoFocus
                  value={cmdKQuery}
                  onChange={e => { setCmdKQuery(e.target.value); setCmdKIndex(0); }}
                  onKeyDown={handleKey}
                  placeholder="Jump to panel…"
                  className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/25 focus:outline-none"
                />
                <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/30">ESC</kbd>
              </div>
              <div className="max-h-72 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-white/25">No panels match "{cmdKQuery}"</div>
                ) : results.map((p, i) => {
                  const Icon = p.icon;
                  const isHighlighted = i === cmdKIndex;
                  return (
                    <button
                      key={p.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isHighlighted ? 'bg-blue-600/25 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white',
                      )}
                      onClick={() => { navigatePanel(p.id); setCmdKOpen(false); }}
                      onMouseEnter={() => setCmdKIndex(i)}
                    >
                      <Icon size={15} className={cn(isHighlighted ? 'text-blue-400' : 'text-white/25')} />
                      <span className="flex-1 text-sm font-bold">{p.title}</span>
                      <span className="text-[10px] font-mono text-white/25">{p.group}</span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-white/8 px-4 py-2 flex items-center gap-4 text-[10px] text-white/20">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> open</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
