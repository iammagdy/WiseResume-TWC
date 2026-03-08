import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';

export default function EmailConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = useCallback(async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message || 'Failed to resend email');
      } else {
        setResent(true);
        toast.success('Confirmation email resent');
      }
    } catch {
      toast.error('Failed to resend email');
    } finally {
      setResending(false);
    }
  }, [email, resending]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md text-center space-y-6"
      >
        <div className="flex justify-center">
          <AppIcon size={56} />
        </div>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
          <p className="text-muted-foreground">
            We sent a confirmation link to{' '}
            {email ? <span className="font-medium text-foreground">{email}</span> : 'your email'}
            . Click the link to verify your account.
          </p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 text-left">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Didn't find it? Check your <span className="font-medium text-foreground">spam</span> or{' '}
            <span className="font-medium text-foreground">junk</span> folder. The email may take a minute to arrive.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {email && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending || resent}
            >
              {resending ? 'Resending…' : resent ? 'Email resent ✓' : 'Resend confirmation email'}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full gap-2"
            onClick={() => navigate('/auth', { replace: true })}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
