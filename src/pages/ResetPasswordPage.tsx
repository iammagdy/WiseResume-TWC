import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { AppIcon } from '@/components/brand/AppIcon';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { supabase } from '@/integrations/supabase/safeClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message || 'Failed to reset password');
      } else {
        toast.success('Password updated successfully!');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <MiniSpinner size={32} />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden">
      <button
        onClick={() => navigate('/auth')}
        className="absolute top-4 left-4 z-20 p-2 rounded-xl active:scale-95 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{
          background: 'hsl(0 0% 100% / 0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid hsl(0 0% 100% / 0.25)',
          color: 'hsl(0 0% 100% / 0.85)',
        }}
        aria-label="Back to auth"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div
          className="w-full max-w-sm p-[1px] rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(355 85% 52% / 0.55), hsl(270 70% 55% / 0.35), hsl(185 90% 45% / 0.28))',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full space-y-6 glass-elevated rounded-[calc(1rem-1px)] p-6 relative overflow-hidden"
            style={{ boxShadow: '0 0 60px -10px hsl(355 85% 52% / 0.35), 0 25px 50px -12px rgba(0,0,0,0.7)' }}
          >
            <div className="flex flex-col items-center gap-3 relative">
              <AppIcon size={56} />
              <h1 className="text-2xl font-bold gradient-text">Set new password</h1>
              <p className="text-sm text-muted-foreground text-center">Choose a new password for your account</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <PasswordInput
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                autoComplete="new-password"
                placeholder="Choose a new password"
                required
              />
              <PasswordStrengthMeter password={newPassword} />
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold gradient-primary glow-primary"
                disabled={isLoading || !newPassword}
              >
                {isLoading ? <MiniSpinner size={20} /> : 'Set new password'}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
