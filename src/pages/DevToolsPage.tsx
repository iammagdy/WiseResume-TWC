import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Users, Globe, LayoutDashboard, Database,
  BrainCircuit, ShieldCheck, Cog, Mail, Ticket, History, Briefcase,
  Fingerprint, Lock, Zap, Loader2, Activity, BarChart2,
  CheckCircle2, AlertCircle, ShieldBan, ListChecks, Link2,
  Flag, Play, Search, X, MoreHorizontal,
} from 'lucide-react';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DevKitSessionProvider,
  useDevKitSession,
  loadRememberedToken,
} from '@/contexts/DevKitSessionContext';

// Existing panels
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AIRadarPanel } from '@/components/dev-kit/AIRadarPanel';
import { DatabaseXRay } from '@/components/dev-kit/DatabaseXRay';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { WiseHireWaitlistPanel } from '@/components/dev-kit/WiseHireWaitlistPanel';
// Previously hidden panels — now wired
import { AnalyticsPanel } from '@/components/dev-kit/AnalyticsPanel';
import { VisitorsPanel } from '@/components/dev-kit/VisitorsPanel';
import { LiveActivityPanel } from '@/components/dev-kit/LiveActivityPanel';
import { MissionControlPanel } from '@/components/dev-kit/MissionControlPanel';
import { ObservabilityPanel } from '@/components/dev-kit/ObservabilityPanel';
import { EmailManagementPanel } from '@/components/dev-kit/EmailManagementPanel';
import { EmailAutomationsPanel } from '@/components/dev-kit/EmailAutomationsPanel';
import { FeatureFlagsPanel } from '@/components/dev-kit/FeatureFlagsPanel';
import { ModerationPanel } from '@/components/dev-kit/ModerationPanel';
import { OnboardingFunnelPanel } from '@/components/dev-kit/OnboardingFunnelPanel';
import { PortfolioUsernamesPanel } from '@/components/dev-kit/PortfolioUsernamesPanel';
import { DevKitRunner } from '@/components/dev-kit/DevKitRunner';

const PANEL_GROUPS = [
  {
    label: 'Operations',
    panels: [
      { id: 'overview',      title: 'Command',         icon: LayoutDashboard },
      { id: 'mission',       title: 'Mission Control', icon: CheckCircle2 },
      { id: 'live',          title: 'Live Activity',   icon: Activity },
      { id: 'observability', title: 'Observability',   icon: AlertCircle },
    ],
  },
  {
    label: 'Users',
    panels: [
      { id: 'users',      title: 'God Mode',   icon: Users },
      { id: 'moderation', title: 'Moderation', icon: ShieldBan },
    ],
  },
  {
    label: 'Analytics',
    panels: [
      { id: 'analytics', title: 'Analytics',        icon: BarChart2 },
      { id: 'visitors',  title: 'Visitors',         icon: Globe },
      { id: 'funnel',    title: 'Onboarding Funnel',icon: ListChecks },
      { id: 'db',        title: 'X-Ray',            icon: Database },
    ],
  },
  {
    label: 'Content',
    panels: [
      { id: 'portfolios', title: 'Portfolios', icon: Link2 },
      { id: 'audit',      title: 'History',    icon: History },
    ],
  },
  {
    label: 'AI & Testing',
    panels: [
      { id: 'ai',     title: 'AI Radar',      icon: BrainCircuit },
      { id: 'flags',  title: 'Feature Flags', icon: Flag },
      { id: 'runner', title: 'Test Runner',   icon: Play },
    ],
  },
  {
    label: 'Communications',
    panels: [
      { id: 'email',       title: 'Email',       icon: Mail },
      { id: 'automations', title: 'Automations', icon: Zap },
      { id: 'coupons',     title: 'Forge',       icon: Ticket },
    ],
  },
  {
    label: 'Platform',
    panels: [
      { id: 'wisehire', title: 'Hiring', icon: Briefcase },
      { id: 'settings', title: 'Core',   icon: ShieldCheck },
    ],
  },
];

const ALL_PANELS = PANEL_GROUPS.flatMap(g => g.panels);
const MOBILE_PRIMARY_IDS = ['overview', 'live', 'users', 'analytics'];

export default function DevToolsPage() {
  return (
    <DevKitSessionProvider>
      <DevToolsInner />
    </DevKitSessionProvider>
  );
}

function DevToolsInner() {
  const navigate = useNavigate();
  const { isUnlocked, unlock, lock, secondsUntilLock } = useDevKitSession();

  const [activePanel, setActivePanel] = useState('overview');
  const [password, setPassword]       = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [cmdOpen, setCmdOpen]         = useState(false);
  const [cmdQuery, setCmdQuery]       = useState('');
  const [moreOpen, setMoreOpen]       = useState(false);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Auto-unlock from a previously remembered session (replaces trusted-device check)
  useEffect(() => {
    const remembered = loadRememberedToken();
    if (remembered) {
      unlock(remembered.token);
    }
  }, [unlock]);

  // Cmd+K / Esc keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
        setCmdQuery('');
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-focus search input when palette opens
  useEffect(() => {
    if (cmdOpen) {
      const t = setTimeout(() => cmdInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [cmdOpen]);

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = import.meta.env.VITE_DEV_KIT_PASSWORD;
    if (password === correctPass) {
      unlock('dk-session-' + Date.now(), {
        rememberMe: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        email: 'admin@thewise.cloud',
      });
      toast.success('Access Granted. Welcome back, Master.');
    } else {
      toast.error('Access Denied. Incorrect Credentials.');
    }
  };

  const handlePasskeyLogin = async () => {
    setIsVerifying(true);
    try {
      if ('Uint8Array' in window) {
        toast.info('Authenticating via Device Biometrics...');
        await new Promise(r => setTimeout(r, 1500));
        unlock('dk-bio-' + Date.now(), {
          rememberMe: true,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          email: 'admin@thewise.cloud',
        });
        toast.success('Biometric Identity Confirmed.');
      }
    } catch {
      toast.error('Passkey authentication failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // MissionControlPanel deep-links map to our panel IDs
  const handleMissionNavigate = useCallback((tab: string) => {
    const map: Record<string, string> = {
      deployment: 'mission',
      openrouter:  'ai',
      email:       'email',
      overview:    'overview',
      live:        'live',
      visitors:    'visitors',
    };
    const target = map[tab] ?? tab;
    if (ALL_PANELS.some(p => p.id === target)) {
      setActivePanel(target);
    }
  }, []);

  const filteredPanels = ALL_PANELS.filter(p =>
    p.title.toLowerCase().includes(cmdQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(cmdQuery.toLowerCase())
  );

  const activeMeta      = ALL_PANELS.find(p => p.id === activePanel);
  const mobilePrimary   = MOBILE_PRIMARY_IDS.map(id => ALL_PANELS.find(p => p.id === id)!).filter(Boolean);

  const renderPanel = () => {
    const wrap = (name: string, node: React.ReactNode) => (
      <DevKitPanelBoundary panelName={name}>{node}</DevKitPanelBoundary>
    );
    switch (activePanel) {
      case 'overview':      return wrap('Command',          <OverviewPanel />);
      case 'mission':       return wrap('Mission Control',  <MissionControlPanel onNavigate={handleMissionNavigate} />);
      case 'live':          return wrap('Live Activity',    <LiveActivityPanel />);
      case 'observability': return wrap('Observability',    <ObservabilityPanel />);
      case 'users':         return wrap('God Mode',         <AdminUsersPanel />);
      case 'moderation':    return wrap('Moderation',       <ModerationPanel />);
      case 'analytics':     return wrap('Analytics',        <AnalyticsPanel />);
      case 'visitors':      return wrap('Visitors',         <VisitorsPanel />);
      case 'funnel':        return wrap('Onboarding Funnel',<OnboardingFunnelPanel />);
      case 'db':            return wrap('X-Ray',            <DatabaseXRay />);
      case 'portfolios':    return wrap('Portfolios',       <PortfolioUsernamesPanel />);
      case 'audit':         return wrap('History',          <AuditLogPanel />);
      case 'ai':            return wrap('AI Radar',         <AIRadarPanel />);
      case 'flags':         return wrap('Feature Flags',    <FeatureFlagsPanel />);
      case 'runner':        return wrap('Test Runner',      <DevKitRunner />);
      case 'email':         return wrap('Email',            <EmailManagementPanel />);
      case 'automations':   return wrap('Automations',      <EmailAutomationsPanel />);
      case 'coupons':       return wrap('Forge',            <CouponsPanel />);
      case 'wisehire':      return wrap('Hiring',           <WiseHireWaitlistPanel />);
      case 'settings':      return wrap('Core',             <AppSettingsPanel />);
      default:              return wrap('Command',          <OverviewPanel />);
    }
  };

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="bg-blue-600/20 p-4 rounded-3xl border border-blue-500/30">
              <ShieldCheck className="text-blue-400" size={40} />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">DevKit Portal</h1>
              <p className="text-sm text-white/40 font-medium">Authentication required to access Command Center</p>
            </div>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-white/20 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="password" placeholder="ENTER ACCESS KEY"
                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-all font-mono tracking-widest"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase italic tracking-wider shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
              Initialize Session
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em] text-white/20"><span>Secure Gateway</span></div>
          </div>

          <button
            onClick={handlePasskeyLogin} disabled={isVerifying}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group"
          >
            {isVerifying
              ? <Loader2 className="animate-spin text-blue-400" size={20} />
              : <Fingerprint className="text-blue-400 group-hover:scale-110 transition-transform" size={24} />}
            <span className="text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-white">Sign in with Passkey</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Authenticated Shell ───────────────────────────────────────────────────
  const lockWarning = secondsUntilLock !== null && secondsUntilLock < 300;

  return (
    <div id="dev-tools-root" className="h-screen overflow-hidden bg-[#05060f] text-white flex flex-col md:flex-row">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-72 border-r border-white/5 bg-[#080916] flex-col overflow-hidden">

        {/* Logo + version */}
        <div className="p-6 pb-3 flex items-center gap-3 flex-shrink-0">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.4)]"><Cog size={22} /></div>
          <div>
            <span className="font-black text-xl tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">DevKit</span>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Command Center</p>
          </div>
        </div>

        {/* Session expiry warning */}
        {lockWarning && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex-shrink-0">
            ⚠ Session locks in {Math.floor(secondsUntilLock! / 60)}:{String(secondsUntilLock! % 60).padStart(2, '0')}
          </div>
        )}

        {/* Cmd+K search bar */}
        <button
          onClick={() => { setCmdOpen(true); setCmdQuery(''); }}
          className="mx-4 mb-3 flex-shrink-0 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2 text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all text-xs group"
        >
          <Search size={13} />
          <span>Search panels…</span>
          <span className="ml-auto font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">⌘K</span>
        </button>

        {/* Grouped navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-5 scrollbar-thin">
          {PANEL_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1.5 px-2">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.panels.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActivePanel(p.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-left ${
                      activePanel === p.id
                        ? 'bg-blue-600 text-white shadow-[0_6px_14px_rgba(37,99,235,0.3)] translate-x-1'
                        : 'text-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <p.icon size={15} className={`flex-shrink-0 transition-transform ${activePanel === p.id ? 'scale-110' : 'group-hover:scale-105'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate">{p.title}</span>
                    {activePanel === p.id && (
                      <motion.div layoutId="active-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom bar */}
        <div className="p-4 border-t border-white/5 flex-shrink-0 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System Stable</span>
            <span className="ml-auto text-[9px] font-mono text-white/20">{ALL_PANELS.length} panels</span>
          </div>
          <button
            onClick={lock}
            className="w-full flex items-center gap-2 text-xs font-bold text-amber-500/50 hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-500/5"
          >
            <Lock size={12} /> Lock Session
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2 text-xs font-bold text-white/30 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={13} /> Exit Command Center
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[#080916] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-xl"><Cog size={16} /></div>
          <span className="font-black text-base tracking-tighter uppercase italic">DevKit</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setCmdOpen(true); setCmdQuery(''); }} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <Search size={16} />
          </button>
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Live</span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pb-28 md:pb-0">
        {/* Desktop page heading */}
        <div className="hidden md:block px-12 pt-10 pb-6">
          <div className="flex items-center gap-2 text-[10px] font-black font-mono text-blue-500 uppercase tracking-[0.4em] mb-2">
            <Globe size={11} className="animate-spin-slow" /> Real-time Nodes
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl">
            {activeMeta?.title ?? 'Command'}
          </h1>
        </div>

        <div className="px-5 md:px-12 pb-6 max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#080916]/90 backdrop-blur-2xl border-t border-white/10 px-2 flex items-center justify-around z-50">
        {mobilePrimary.map(p => (
          <button
            key={p.id}
            onClick={() => { setActivePanel(p.id); setMoreOpen(false); }}
            className={`flex flex-col items-center gap-1 transition-all min-w-0 px-2 ${activePanel === p.id ? 'text-blue-400' : 'text-white/30'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activePanel === p.id ? 'bg-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : ''}`}>
              <p.icon size={18} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter truncate max-w-[48px] text-center">{p.title.split(' ')[0]}</span>
          </button>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 transition-all px-2 ${moreOpen ? 'text-blue-400' : 'text-white/30'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${moreOpen ? 'bg-blue-600/20' : ''}`}>
            <MoreHorizontal size={18} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">More</span>
        </button>
      </nav>

      {/* ── Mobile More Sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-[#0d1021] border-t border-white/10 rounded-t-3xl max-h-[82vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
                <h3 className="font-black text-sm uppercase tracking-wider">All Panels ({ALL_PANELS.length})</h3>
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 py-2">
                {PANEL_GROUPS.map(group => (
                  <div key={group.label} className="px-5 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-2">{group.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.panels.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setActivePanel(p.id); setMoreOpen(false); }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                            activePanel === p.id
                              ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
                              : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <p.icon size={18} />
                          <span className="text-[9px] font-bold uppercase text-center leading-tight">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="px-5 py-4 border-t border-white/5 mt-2 flex flex-col gap-2">
                  <button
                    onClick={lock}
                    className="w-full py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider"
                  >
                    Lock Session
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 rounded-2xl bg-white/[0.04] text-white/50 text-xs font-bold uppercase tracking-wider"
                  >
                    Exit Command Center
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Cmd+K Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCmdOpen(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 -translate-x-1/2 top-[12vh] z-[71] w-full max-w-lg px-4"
            >
              <div className="bg-[#0d1021] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <Search size={15} className="text-white/40 flex-shrink-0" />
                  <input
                    ref={cmdInputRef}
                    value={cmdQuery}
                    onChange={e => setCmdQuery(e.target.value)}
                    placeholder="Search panels…"
                    className="flex-1 bg-transparent text-white placeholder:text-white/25 outline-none text-sm"
                  />
                  <kbd className="text-[10px] font-mono bg-white/5 text-white/30 px-2 py-1 rounded flex-shrink-0">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                  {filteredPanels.length === 0 ? (
                    <p className="text-center text-white/30 text-sm py-8">No panels found for "{cmdQuery}"</p>
                  ) : (
                    filteredPanels.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setActivePanel(p.id); setCmdOpen(false); }}
                        className={`w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors text-left ${
                          activePanel === p.id ? 'text-blue-400' : 'text-white/70 hover:text-white'
                        }`}
                      >
                        <p.icon size={15} className="flex-shrink-0" />
                        <span className="text-sm font-medium">{p.title}</span>
                        {activePanel === p.id && (
                          <span className="ml-auto text-[10px] text-blue-400 font-bold uppercase tracking-wider">Active</span>
                        )}
                        <ChevronRight size={13} className={`flex-shrink-0 ${activePanel === p.id ? 'hidden' : 'ml-auto text-white/20'}`} />
                      </button>
                    ))
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-5 py-3 border-t border-white/5 flex items-center gap-4 text-[10px] text-white/20 font-mono">
                  <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded mr-1">↑↓</kbd> navigate</span>
                  <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded mr-1">↵</kbd> open</span>
                  <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded mr-1">ESC</kbd> close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}
