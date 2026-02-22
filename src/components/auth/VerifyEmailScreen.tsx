import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';

interface VerifyEmailScreenProps {
  email: string;
  onBackToLogin: () => void;
  /** If true, shows "email not confirmed" messaging instead of post-signup */
  variant?: 'post-signup' | 'not-confirmed';
}

const RESEND_COOLDOWN = 60;

export function VerifyEmailScreen({ email, onBackToLogin, variant = 'post-signup' }: VerifyEmailScreenProps) {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Verification email sent!');
        setResendCooldown(RESEND_COOLDOWN);
      }
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const isNotConfirmed = variant === 'not-confirmed';

  return (
    <motion.div
      className="space-y-6 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          {isNotConfirmed ? 'Email Not Verified' : 'Check Your Email'}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isNotConfirmed
            ? 'Your email address has not been verified yet. Please check your inbox and click the verification link.'
            : "We've sent a verification link to your email. Please check your inbox and click the link to activate your account."}
        </p>
        <p className="text-sm font-medium text-foreground break-all">{email}</p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-11"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
        >
          {isResending ? (
            <><MiniSpinner size={16} className="mr-2" />Sending...</>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Resend Verification Email</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Didn't receive it? Check your spam folder or try resending.
        </p>
      </div>

      <button
        type="button"
        onClick={onBackToLogin}
        className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm min-h-[44px] touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </button>
    </motion.div>
  );
}
