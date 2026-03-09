import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertTriangle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';
import { AppIcon } from '@/components/brand/AppIcon';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useIsDark } from '@/hooks/useIsDark';

const OTP_LENGTH = 6;

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = value.split('');
    next[index] = char;
    const joined = next.join('').slice(0, OTP_LENGTH);
    onChange(joined);
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl glass-input border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 touch-manipulation"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function EmailConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { email?: string; verifyMethod?: string; password?: string; fullName?: string };
  const email = state?.email || '';
  const verifyMethod = state?.verifyMethod || 'link';
  const signupPassword = state?.password || '';
  const signupFullName = state?.fullName || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Auto-submit when all 6 digits entered (OTP mode only)
  useEffect(() => {
    if (verifyMethod === 'otp' && otp.length === OTP_LENGTH && !verifying && !verified) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleVerifyOtp = useCallback(async () => {
    if (!email || otp.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    try {
      // Call our custom verify-signup-otp edge function
      const { data, error } = await edgeFunctions.functions.invoke('verify-signup-otp', {
        body: { email, otp },
      });

      const result = data as Record<string, unknown> | null;

      if (error || (result && 'error' in result)) {
        const msg = (result as any)?.error || (error as any)?.message || 'Invalid code. Please try again.';
        toast.error(msg);
        setOtp('');
        return;
      }

      if (result?.requiresSignIn) {
        // User confirmed but couldn't auto-sign-in
        toast.success('Email verified! Please sign in.');
        setTimeout(() => navigate('/auth', { replace: true }), 1200);
        return;
      }

      // Use the returned token_hash to get a session via verifyOtp
      if (result?.token_hash) {
        const { error: sessionError } = await supabase.auth.verifyOtp({
          email,
          token_hash: result.token_hash as string,
          type: 'magiclink',
        });
        if (sessionError) {
          console.warn('[verify-otp] Session creation failed, user can sign in manually:', sessionError.message);
          toast.success('Email verified! Please sign in.');
          setTimeout(() => navigate('/auth', { replace: true }), 1200);
          return;
        }
      }

      setVerified(true);
      toast.success('Email verified!');
      setTimeout(() => navigate('/onboarding', { replace: true }), 1200);
    } catch {
      toast.error('Verification failed. Please try again.');
      setOtp('');
    } finally {
      setVerifying(false);
    }
  }, [email, otp, verifying, navigate]);

  const handleResend = useCallback(async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      if (verifyMethod === 'otp') {
        // Call the custom edge function to re-send OTP
        const { data, error } = await edgeFunctions.functions.invoke('send-signup-otp', {
          body: { email, password: signupPassword, fullName: signupFullName },
        });
        if (error || (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>))) {
          const msg = (data as any)?.error || (error as any)?.message || 'Failed to resend code';
          toast.error(msg);
        } else {
          setResent(true);
          setOtp('');
          toast.success('New code sent to your email');
          setTimeout(() => setResent(false), 30000);
        }
      } else {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          toast.error(error.message || 'Failed to resend email');
        } else {
          setResent(true);
          setOtp('');
          toast.success('New verification link sent');
          setTimeout(() => setResent(false), 30000);
        }
      }
    } catch {
      toast.error('Failed to resend email');
    } finally {
      setResending(false);
    }
  }, [email, resending, verifyMethod, signupPassword, signupFullName]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Glass card with gradient border — matches AuthPage */}
      <div
        className="w-full max-w-md p-[1px] rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(355 85% 52% / 0.7), hsl(270 70% 55% / 0.5), hsl(185 90% 45% / 0.4))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full text-center space-y-6 rounded-[calc(1rem-1px)] p-6 relative overflow-hidden"
          style={{
            background: 'hsl(var(--card) / 0.25)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid hsl(0 0% 100% / 0.12)',
            boxShadow: '0 0 60px -10px hsl(355 85% 52% / 0.25), 0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex justify-center">
            <AppIcon size={56} />
          </div>

          {verified ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
              <p className="text-muted-foreground">Redirecting to your dashboard…</p>
            </motion.div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                {verifyMethod === 'otp' ? (
                  <Mail className="w-8 h-8 text-primary" />
                ) : (
                  <LinkIcon className="w-8 h-8 text-primary" />
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
                <p className="text-muted-foreground">
                  {verifyMethod === 'otp'
                    ? <>We sent a 6-digit code to{' '}<span className="font-medium text-foreground">{email || 'your email'}</span></>
                    : <>We sent a verification link to{' '}<span className="font-medium text-foreground">{email || 'your email'}</span></>
                  }
                </p>
              </div>

              {verifyMethod === 'otp' ? (
                <>
                  {/* OTP Input */}
                  <div className="space-y-4 py-2">
                    <OtpInput value={otp} onChange={setOtp} disabled={verifying} />
                    {verifying && (
                      <div className="flex items-center justify-center gap-2">
                        <MiniSpinner size={16} />
                        <span className="text-sm text-muted-foreground">Verifying…</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 text-left">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Didn't find it? Check your <span className="font-medium text-foreground">spam</span> or{' '}
                      <span className="font-medium text-foreground">junk</span> folder.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-4 space-y-4">
                  <p className="text-muted-foreground">
                    Click the link in your email to verify your account and sign in. The link will expire in 24 hours.
                  </p>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 text-left">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Didn't find it? Check your <span className="font-medium text-foreground">spam</span> or{' '}
                      <span className="font-medium text-foreground">junk</span> folder.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {email && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={resending || resent}
                  >
                    {resending ? 'Sending…' : resent ? 'Email resent ✓' : verifyMethod === 'otp' ? 'Resend code' : 'Resend link'}
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
