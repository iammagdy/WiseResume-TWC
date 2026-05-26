import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

import { account as appwriteAccount } from '@/lib/appwrite';
import { getAuthEmailCallbackParams } from '@/lib/authEmailCallbackParams';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AppIcon } from '@/components/brand/AppIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HERO_GRADIENT = 'linear-gradient(135deg, #0a0a1a 0%, #0f1525 25%, #12101e 50%, #0d1520 75%, #0a0a1a 100%)';

export default function AuthResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { userId: callbackUserId, secret: callbackSecret } = getAuthEmailCallbackParams(
    typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    typeof window !== 'undefined' ? window.location.hash : '',
  );
  const userId = callbackUserId ?? '';
  const secret = callbackSecret ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isValidLink = !!userId && !!secret;

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await appwriteAccount.updateRecovery(userId, secret, password);
      setDone(true);
      toast.success('Password updated! Please sign in.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
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
              {done ? 'Password Updated' : 'Set New Password'}
            </h1>
          </div>

          {!isValidLink && (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="text-amber-400" size={32} />
              <p className="text-sm text-white/60">
                This link is invalid or has already been used. Please request a new password reset.
              </p>
              <Button className="w-full h-11" onClick={() => navigate('/auth?mode=login')}>
                Back to Login
              </Button>
            </div>
          )}

          {isValidLink && done && (
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldCheck className="text-green-400" size={36} />
              <p className="text-sm text-white/60">
                Your password has been reset. Sign in with your new password to continue.
              </p>
              <Button className="w-full h-11" onClick={() => navigate('/auth?mode=login')}>
                Sign In
              </Button>
            </div>
          )}

          {isValidLink && !done && (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : 'Update Password'}
              </Button>
              <p className="text-xs text-center text-white/30">
                Remembered it?{' '}
                <button type="button" onClick={() => navigate('/auth?mode=login')} className="text-primary hover:underline">
                  Back to Login
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
