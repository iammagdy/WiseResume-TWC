import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, Mail, User, Key } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { account as appwriteAccount, ID, databases, DATABASE_ID, Query } from '@/lib/appwrite';

const HERO_GRADIENT = 'linear-gradient(135deg, #0a0a1a 0%, #0f1525 25%, #12101e 50%, #0d1520 75%, #0a0a1a 100%)';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [view, setView] = useState<'login' | 'register' | 'claim-account'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    if (isAuthenticated && !authLoading) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, authLoading, navigate, redirectTo]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Try Normal Login
      await appwriteAccount.createEmailPasswordSession(email, password);
      toast.success('Logged in successfully!');
      window.location.reload();
    } catch (err: any) {
      // 2. Check if user is a Migrated User (Special Flow)
      // Since we can't know the password, any login failure for a migrated email
      // can trigger the 'Claim' flow.
      try {
        const profileRes = await databases.listDocuments(DATABASE_ID, 'profiles', [
          Query.equal('email', email)
        ]);
        
        if (profileRes.total > 0) {
          toast.info('Account found! Since we updated our system, please set a new password.');
          setView('claim-account');
        } else {
          toast.error('Invalid credentials. If you are new, please Sign Up.');
        }
      } catch (checkErr) {
        toast.error(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAccount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Using Appwrite's recovery system or a direct password update if they were authenticated
      // For simplicity in this 'vibe' flow, we trigger a Password Reset Email
      await appwriteAccount.createRecovery(email, window.location.origin + '/auth-reset-password');
      toast.success('Reset link sent! Check your email to set your new password.');
      setView('login');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appwriteAccount.create(ID.unique(), email, password, name);
      await appwriteAccount.createEmailPasswordSession(email, password);
      toast.success('Account created successfully!');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden" style={{ background: HERO_GRADIENT }}>
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div 
          className="flex flex-col gap-6 px-8 py-10 rounded-2xl max-w-sm w-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col items-center gap-4">
            <AppIcon size={48} />
            <h1 className="text-2xl font-bold text-white text-center">
              {view === 'claim-account' ? 'Claim Your Account' : 'WiseResume AI'}
            </h1>
          </div>

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
              <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : 'Login'}
              </Button>
              <p className="text-xs text-center text-white/40">
                Don't have an account? <button type="button" onClick={() => setView('register')} className="text-primary hover:underline">Sign up</button>
              </p>
            </form>
          )}

          {view === 'claim-account' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/60">We found your migrated data. To keep it secure, please set a new password.</p>
              <Button onClick={handleClaimAccount} className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : 'Send Reset Link'}
              </Button>
              <button onClick={() => setView('login')} className="text-xs text-white/30 hover:underline">Back to Login</button>
            </div>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
              <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : 'Create Account'}
              </Button>
              <p className="text-xs text-center text-white/40">
                Already have an account? <button type="button" onClick={() => setView('login')} className="text-primary hover:underline">Login</button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
