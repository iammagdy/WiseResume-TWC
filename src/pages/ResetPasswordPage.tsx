import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { AppIcon } from '@/components/brand/AppIcon';
import { supabase } from '@/integrations/supabase/safeClient';
import { logAudit } from '@/lib/auditLogger';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Listen for PASSWORD_RECOVERY event and check URL hash for recovery token
  useEffect(() => {
    // Check hash for type=recovery (Supabase implicit flow)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setRecoveryReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    });

    // Redirect if no recovery session detected within 3 seconds
    timeoutRef.current = setTimeout(() => {
      if (!recoveryReady) {
        // Check if we already have a session (user may have landed here from email)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/auth?mode=forgot', { replace: true });
          } else {
            // Session exists, likely recovery — allow form
            setRecoveryReady(true);
          }
        });
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPasswordError = () => {
    if (!password) return 'Password is required';
    try { passwordSchema.parse(password); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid password'; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });

    const pwError = getPasswordError();
    if (pwError) return;
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Handle pwned/weak password
        if (
          error.message?.toLowerCase().includes('weak') ||
          error.message?.toLowerCase().includes('pwned') ||
          (error as any).code === 'weak_password'
        ) {
          toast.error(
            'This password has been found in a data breach. Please choose a stronger, unique password.',
            { duration: 6000 }
          );
          return;
        }
        toast.error(error.message || 'Failed to update password.');
        return;
      }
      logAudit('auth', 'password_updated', {});
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/dashboard', { replace: true }), 600);
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordError = getPasswordError();

  // Show loading state while waiting for recovery detection
  if (!recoveryReady) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <MiniSpinner size={32} />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col px-4 py-6 pb-safe">
        <motion.button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 text-muted-foreground mb-4 min-h-[44px] touch-manipulation active:opacity-70"
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back</span>
        </motion.button>

        <motion.div
          className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <motion.div className="flex justify-center mb-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <AppIcon size={48} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]" />
          </motion.div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold mb-1">Set New Password</h1>
            <p className="text-sm text-muted-foreground">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <PasswordInput
                id="new-password" label="New Password"
                value={password} onChange={setPassword}
                onBlur={() => setTouched(p => ({ ...p, password: true }))}
                show={showPassword} onToggleShow={() => setShowPassword(!showPassword)}
                autoComplete="new-password"
                error={passwordError} touched={touched.password} required
              />
              <div className="mt-2">
                <PasswordStrengthMeter password={password} />
              </div>
            </div>
            <PasswordInput
              id="confirm-password" label="Confirm Password"
              value={confirm} onChange={setConfirm}
              onBlur={() => setTouched(p => ({ ...p, confirm: true }))}
              show={showConfirm} onToggleShow={() => setShowConfirm(!showConfirm)}
              autoComplete="new-password"
              error={touched.confirm && confirm && password !== confirm ? 'Passwords do not match' : undefined}
              touched={touched.confirm} required
            />
            <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
              {isLoading ? <><MiniSpinner size={20} className="mr-2" />Updating...</> : 'Update Password'}
            </Button>
          </form>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
