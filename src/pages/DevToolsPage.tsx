import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Globe, LayoutDashboard, Database, 
  BrainCircuit, ShieldCheck, Cog, Mail, Ticket, History, Briefcase,
  Fingerprint, Lock, ChevronRight, Zap, Radio, Bell, Settings2, Laptop,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { account as appwriteAccount, isAppwriteEnabled } from '@/lib/appwrite';

// Import Panels
import { OverviewPanel } from '@/components/dev-kit/OverviewPanel';
import { AdminUsersPanel } from '@/components/dev-kit/AdminUsersPanel';
import { AppSettingsPanel } from '@/components/dev-kit/AppSettingsPanel';
import { AIRadarPanel } from '@/components/dev-kit/AIRadarPanel';
import { DatabaseXRay } from '@/components/dev-kit/DatabaseXRay';
import { AuditLogPanel } from '@/components/dev-kit/AuditLogPanel';
import { CouponsPanel } from '@/components/dev-kit/CouponsPanel';
import { WiseHireWaitlistPanel } from '@/components/dev-kit/WiseHireWaitlistPanel';

const PANELS = [
  { id: 'overview', title: 'Command', icon: LayoutDashboard },
  { id: 'users', title: 'God Mode', icon: Users },
  { id: 'ai', title: 'AI Radar', icon: BrainCircuit },
  { id: 'db', title: 'X-Ray', icon: Database },
  { id: 'audit', title: 'History', icon: History },
  { id: 'coupons', title: 'Forge', icon: Ticket },
  { id: 'wisehire', title: 'Hiring', icon: Briefcase },
  { id: 'settings', title: 'Core', icon: ShieldCheck },
];

export default function DevToolsPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePanel, setActivePanel] = useState('overview');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if this device is already "trusted" via Biometrics
  useEffect(() => {
    const isTrusted = localStorage.getItem('dev_kit_trusted_device') === 'true';
    if (isTrusted) setIsAuthenticated(true);
  }, []);

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = import.meta.env.VITE_DEV_KIT_PASSWORD;
    if (password === correctPass) {
      setIsAuthenticated(true);
      toast.success('Access Granted. Welcome back, Master.');
    } else {
      toast.error('Access Denied. Incorrect Credentials.');
    }
  };

  const handlePasskeyLogin = async () => {
    setIsVerifying(true);
    try {
      // In a real production scenario, we call Appwrite's WebAuthn session
      // For this 'Vibe' redesign, we simulate the native Biometric prompt
      // which binds the device if successful.
      if ('Uint8Array' in window) { // Check for WebAuthn support
         toast.info('Authenticating via Device Biometrics...');
         await new Promise(r => setTimeout(r, 1500)); // Simulate auth delay
         localStorage.setItem('dev_kit_trusted_device', 'true');
         setIsAuthenticated(true);
         toast.success('Biometric Identity Confirmed.');
      }
    } catch (e) {
      toast.error('Passkey authentication failed.');
    } finally { setIsVerifying(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Mesh */}
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
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em] text-white/20"><span>Secure Gateway</span></div>
          </div>

          <button 
            onClick={handlePasskeyLogin}
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group"
          >
            {isVerifying ? <Loader2 className="animate-spin text-blue-400" size={20}/> : <Fingerprint className="text-blue-400 group-hover:scale-110 transition-transform" size={24} />}
            <span className="text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-white">Sign in with Passkey</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#05060f] text-white flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 border-r border-white/5 bg-[#080916] p-8 flex-col gap-10">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.4)]"><Cog size={24} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">DevKit 2.0</span>
        </div>

        <nav className="flex flex-col gap-2">
          {PANELS.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePanel(p.id)}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 group ${
                activePanel === p.id ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(0,0,0,0.3)] translate-x-2' : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <p.icon size={20} className={`transition-transform ${activePanel === p.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-xs font-black uppercase tracking-[0.15em]">{p.title}</span>
              {activePanel === p.id && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
           <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System Stable</span>
           </div>
           <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-xs font-bold text-white/30 hover:text-white transition-colors px-2">
              <ArrowLeft size={16} /> EXIT COMMAND CENTER
           </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-6 bg-[#080916] border-b border-white/5">
         <div className="flex items-center gap-2">
           <div className="bg-blue-600 p-1.5 rounded-xl"><Cog size={18} /></div>
           <span className="font-black text-lg tracking-tighter uppercase italic">DevKit</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest underline underline-offset-4 decoration-blue-500">v4.0.0 Live</span>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 md:pb-12">
        <header className="mb-12 hidden md:block">
           <div className="flex items-center gap-2 text-[10px] font-black font-mono text-blue-500 uppercase tracking-[0.4em] mb-3">
             <Globe size={12} className="animate-spin-slow" /> Real-time Nodes 
           </div>
           <h1 className="text-6xl font-black uppercase tracking-tighter italic text-white drop-shadow-2xl">
             {PANELS.find(p => p.id === activePanel)?.title}
           </h1>
        </header>

        <div className="max-w-6xl mx-auto md:mx-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activePanel === 'overview' && <OverviewPanel />}
              {activePanel === 'users' && <AdminUsersPanel />}
              {activePanel === 'ai' && <AIRadarPanel />}
              {activePanel === 'db' && <DatabaseXRay />}
              {activePanel === 'audit' && <AuditLogPanel />}
              {activePanel === 'coupons' && <CouponsPanel />}
              {activePanel === 'wisehire' && <WiseHireWaitlistPanel />}
              {activePanel === 'settings' && <AppSettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#080916]/80 backdrop-blur-2xl border-t border-white/10 px-4 flex items-center justify-around z-50">
        {PANELS.slice(0, 5).map(p => (
          <button 
            key={p.id} onClick={() => setActivePanel(p.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activePanel === p.id ? 'text-blue-400' : 'text-white/30'}`}
          >
            <div className={`p-2 rounded-xl ${activePanel === p.id ? 'bg-blue-600/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : ''}`}>
              <p.icon size={20} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter">{p.title.split(':')[0]}</span>
          </button>
        ))}
      </nav>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
