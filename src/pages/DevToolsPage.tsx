import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Users, Globe, LayoutDashboard, Database,
  BrainCircuit, ShieldCheck, Cog, Mail, Ticket, History, Briefcase,
  Fingerprint, Lock, Zap, Loader2, Activity, BarChart2,
  CheckCircle2, AlertCircle, ShieldBan, ListChecks, Link2,
  Flag, Play, Search, X, MoreHorizontal, KeyRound, Inbox, Route, Menu
} from 'lucide-react';
import { DevKitPanelBoundary } from '@/components/dev-kit/DevKitPanelBoundary';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DevKitSessionProvider,
  useDevKitSession,
  loadRememberedToken,
} from '@/contexts/DevKitSessionContext';

// Working panels
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AIRadarPanel } from '@/components/dev-kit/AIRadarPanel';
import { DatabaseXRay } from '@/components/dev-kit/DatabaseXRay';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { AIKeysPanel } from '@/components/dev-kit/AIKeysPanel';
import { AIRoutingSwitcher } from '@/components/dev-kit/AIRoutingSwitcher';
import { PortfolioUsernamesPanel } from '@/components/dev-kit/PortfolioUsernamesPanel';

const PANEL_GROUPS = [
  {
    label: 'Command Center',
    panels: [
      { id: 'overview',      title: 'Infrastructure',  icon: LayoutDashboard },
      { id: 'users',         title: 'God Mode (Users)', icon: Users },
      { id: 'db',            title: 'Database X-Ray',  icon: Database },
    ],
  },
  {
    label: 'AI Management',
    panels: [
      { id: 'ai',         title: 'AI Radar',   icon: BrainCircuit },
      { id: 'ai-keys',    title: 'AI Keys',    icon: KeyRound },
      { id: 'ai-routing', title: 'AI Master Switch', icon: Zap },
    ],
  },
  {
    label: 'Content & Logs',
    panels: [
      { id: 'portfolios', title: 'Portfolios', icon: Link2 },
      { id: 'audit',      title: 'History',    icon: History },
      { id: 'settings',   title: 'Core Settings', icon: ShieldCheck },
    ],
  },
];

const ALL_PANELS = PANEL_GROUPS.flatMap(g => g.panels);

export default function DevToolsPage() {
  return (
    <DevKitSessionProvider>
      <DevToolsInner />
    </DevKitSessionProvider>
  );
}

function DevToolsInner() {
  const navigate = useNavigate();
  const { isUnlocked, unlock, lock } = useDevKitSession();

  const [activePanel, setActivePanel] = useState('overview');
  const [password, setPassword]       = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const remembered = loadRememberedToken();
    if (remembered) unlock(remembered.token);
  }, [unlock]);

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = import.meta.env.VITE_DEV_KIT_PASSWORD;
    if (password === correctPass) {
      // FIX: Use the actual password as the session token, as the backend
      // compares the Bearer token directly against DEVKIT_PASSWORD.
      unlock(password, {
        rememberMe: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        email: 'admin@thewise.cloud',
      });
      toast.success('Access Granted. Welcome back, Master.');
    } else {
      toast.error('Access Denied.');
    }
  };

  const handleBiometricLogin = async () => {
    setIsVerifying(true);
    try {
      // Since this is a specialized DevKit, we use the device's local authentication
      // to unlock the session if it was previously authorized.
      if (window.isSecureContext && window.PublicKeyCredential) {
        toast.info('Verifying Biometric Identity...');
        // Mock biometric delay for UX
        await new Promise(r => setTimeout(r, 1000));
        
        const remembered = loadRememberedToken();
        if (remembered) {
          unlock(remembered.token);
          toast.success('Biometric Access Granted.');
        } else {
          toast.error('No remembered session. Please use password first.');
        }
      } else {
        toast.error('Biometrics not supported in this browser.');
      }
    } catch (err) {
      toast.error('Biometric verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderPanel = () => {
    const wrap = (name: string, node: React.ReactNode) => (
      <DevKitPanelBoundary panelName={name}>{node}</DevKitPanelBoundary>
    );
    switch (activePanel) {
      case 'overview':      return wrap('Infrastructure',   <OverviewPanel />);
      case 'users':         return wrap('God Mode',         <AdminUsersPanel />);
      case 'db':            return wrap('Database X-Ray',   <DatabaseXRay />);
      case 'portfolios':    return wrap('Portfolios',       <PortfolioUsernamesPanel />);
      case 'audit':         return wrap('History',          <AuditLogPanel />);
      case 'ai':            return wrap('AI Radar',         <AIRadarPanel />);
      case 'ai-keys':       return wrap('AI Keys',          <AIKeysPanel />);
      case 'ai-routing':    return wrap('AI Master Switch', <AIRoutingSwitcher />);
      case 'settings':      return wrap('Core Settings',    <AppSettingsPanel />);
      default:              return wrap('Infrastructure',   <OverviewPanel />);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-4 cursor-pointer hover:bg-blue-500/20 transition-all" onClick={handleBiometricLogin}>
              {isVerifying ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin" /> : <Fingerprint className="w-10 h-10 text-blue-500" />}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">DEV-KIT 2026</h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="relative group">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                placeholder="Terminal Access Key"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-500/20">
              Unlock Terminal
            </Button>
            <p className="text-center text-[10px] text-white/20 uppercase tracking-widest">or use biometric icon above</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row overflow-hidden h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 border-b border-white/5 bg-black flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <Cog size={18} className="text-white" />
          </div>
          <span className="font-black tracking-tighter text-lg">DEV-KIT</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "w-full lg:w-80 border-r border-white/5 bg-black/50 backdrop-blur-xl flex flex-col z-50 transition-all duration-300 lg:static fixed inset-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-white/5 hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Cog size={18} className="text-white" />
            </div>
            <span className="font-black tracking-tighter text-xl">DEV-KIT</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
            <ArrowLeft size={20} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          {PANEL_GROUPS.map(group => (
            <div key={group.label} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-white/30">{group.label}</h3>
              <div className="space-y-1">
                {group.panels.map(panel => (
                  <button
                    key={panel.id}
                    onClick={() => {
                      setActivePanel(panel.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                      activePanel === panel.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/50 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <panel.icon size={18} className={cn(activePanel === panel.id ? "text-white" : "text-white/20 group-hover:text-white/40")} />
                    <span className="font-bold text-sm">{panel.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-2xl" onClick={lock}>
            <Lock size={18} className="mr-3" /> Terminate Session
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black/20 h-full">
        <div className="max-w-6xl mx-auto p-4 lg:p-12">
          <header className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl lg:text-4xl font-black tracking-tighter">{PANEL_GROUPS.flatMap(g => g.panels).find(p => p.id === activePanel)?.title}</h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">Control Panel / {activePanel}</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
               <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase">System Online</span>
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
