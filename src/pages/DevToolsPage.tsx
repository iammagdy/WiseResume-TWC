import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { ArrowLeft, Cog, Lock, Menu, Search, ShieldCheck, X } from 'lucide-react';
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
import { PANEL_GROUPS, DEVTOOLS_PANEL_ALIASES, allPanels, groupForPanel, type PanelDef, type PanelStatus } from '@/lib/devkit/devToolsPanelConfig';
import { DevKitNavItem, DevKitSidebarGroup, DevKitStatusBadge, DevKitSection, DevKitPanelHeader, type DevKitStatusVariant } from '@/components/dev-kit/DevKitUI';

function panelStatusVariant(status: PanelStatus): DevKitStatusVariant {
  switch (status) {
    case 'Live': return 'live';
    case 'Needs Appwrite Function': return 'needs-function';
    case 'Needs Schema': return 'needs-schema';
    case 'Planned': return 'planned';
  }
}

function NotReadyPanel({ panel }: { panel: PanelDef }) {
  return (
    <DevKitSection
      title={panel.title}
      description="This surface is visible in the DevKit but intentionally blocked from executing until its backend prerequisites are ready."
      icon={panel.icon}
      action={<DevKitStatusBadge variant={panelStatusVariant(panel.status)} label={panel.status} />}
    >
      {panel.blockers && panel.blockers.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Blockers from live Appwrite audit
          </p>
          {panel.blockers.map(blocker => (
            <div key={blocker} className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {blocker}
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        The Diagnostics panel remains the source of truth for current deployment, schema, and environment readiness.
      </p>
    </DevKitSection>
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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-3 text-center">
            <div className="mx-auto inline-flex rounded-2xl border border-border bg-card p-4">
              {isVerifying ? <MiniSpinner size={40} className="text-primary" /> : <ShieldCheck className="h-10 w-10 text-primary" />}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">DevKit</h1>
            <p className="text-xs text-muted-foreground">
              Verifying Appwrite admin session
            </p>
            {user?.email && (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-mono text-foreground">{user.email}</span>
              </p>
            )}
          </div>
          {unlockError ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {unlockError}
              </div>
              <Button
                type="button"
                onClick={() => void requestAdminSession(true)}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? <MiniSpinner size={18} className="mr-2" /> : null}
                Retry admin verification
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Back to dashboard
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              No password is required. Access requires the Appwrite <code className="text-foreground">admin</code> label on your account (or a matching <code className="text-foreground">ADMIN_EMAIL</code> on the function).
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeDef = allPanels().find(p => p.id === activePanel) ?? allPanels()[0];
  const activeGroup = groupForPanel(activePanel);

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-background text-foreground lg:flex-row">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-card p-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cog size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">DevKit</span>
            <span className="text-xs text-muted-foreground">{activeDef.title}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-all duration-200 lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="hidden items-center justify-between border-b border-border p-4 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cog size={18} />
            </div>
            <span className="text-lg font-semibold tracking-tight">DevKit</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {PANEL_GROUPS.map(group => (
            <DevKitSidebarGroup key={group.label} label={group.label}>
              {group.panels.map(panel => {
                const badgeCount = badgeCounts[panel.id] ?? 0;
                const isActive = activePanel === panel.id;
                return (
                  <DevKitNavItem
                    key={panel.id}
                    icon={panel.icon}
                    label={panel.title}
                    active={isActive}
                    onClick={() => navigatePanel(panel.id)}
                    badge={badgeCount > 0 ? badgeCount : undefined}
                    status={badgeCount > 0 ? undefined : panelStatusVariant(panel.status)}
                  />
                );
              })}
            </DevKitSidebarGroup>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          {secondsUntilLock !== null && (
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-[10px] font-mono text-muted-foreground">
              Auto-lock in {Math.ceil(secondsUntilLock / 60)}m
            </div>
          )}
          <button
            type="button"
            onClick={() => { setCmdKOpen(true); setCmdKQuery(''); setCmdKIndex(0); }}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-medium">Jump to panel…</span>
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">⌘K</kbd>
          </button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={lock}>
            <Lock size={18} className="mr-3" /> Terminate Session
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="h-full flex-1 overflow-x-hidden overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl p-6 lg:p-10">
          <DevKitPanelHeader
            title={activeDef.title}
            description={`${activeGroup} / ${activeDef.title}`}
            className="mb-8"
          >
            <DevKitStatusBadge variant={panelStatusVariant(activeDef.status)} label={activeDef.status} />
          </DevKitPanelHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
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
            className="fixed inset-0 z-[100] flex items-start justify-center bg-background/60 backdrop-blur-sm px-3 pt-6 sm:pt-24"
            onClick={() => setCmdKOpen(false)}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={cmdKQuery}
                  onChange={e => { setCmdKQuery(e.target.value); setCmdKIndex(0); }}
                  onKeyDown={handleKey}
                  placeholder="Jump to panel…"
                  className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">ESC</kbd>
              </div>
              <div className="max-h-72 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No panels match &ldquo;{cmdKQuery}&rdquo;</div>
                ) : results.map((p, i) => {
                  const Icon = p.icon;
                  const isHighlighted = i === cmdKIndex;
                  return (
                    <button
                      key={p.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isHighlighted ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      onClick={() => { navigatePanel(p.id); setCmdKOpen(false); }}
                      onMouseEnter={() => setCmdKIndex(i)}
                    >
                      <Icon size={16} className={cn(isHighlighted ? 'text-foreground' : 'text-muted-foreground/60')} />
                      <span className="flex-1 text-sm font-medium">{p.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.group}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
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
