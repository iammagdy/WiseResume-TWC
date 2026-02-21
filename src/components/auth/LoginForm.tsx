import { useState } from 'react';
import { Mail, Loader2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputFormField } from '@/components/ui/form-field';
import { PasswordInput } from './PasswordInput';
import { SocialAuthButtons } from './SocialAuthButtons';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const loginPasswordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  onSwitchToSignup: () => void;
  onMagicLink: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  isLoading: boolean;
  isSlowConnection: boolean;
  socialLoading: 'google' | 'apple' | null;
}

export function LoginForm({
  onSubmit, onForgotPassword, onSwitchToSignup, onMagicLink,
  onGoogleSignIn, onAppleSignIn,
  isLoading, isSlowConnection, socialLoading,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errorCount, setErrorCount] = useState(0);

  const getEmailError = () => {
    if (!email) return 'Email is required';
    try { emailSchema.parse(email); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid email'; }
  };
  const getPasswordError = () => {
    if (!password) return 'Password is required';
    try { loginPasswordSchema.parse(password); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid password'; }
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errors = [emailError, passwordError].filter(Boolean).length;
    setErrorCount(errors);
    if (errors > 0) return;
    await onSubmit(email, password);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputFormField
          id="email" label="Email" type="email"
          icon={<Mail className="w-4 h-4" />}
          value={email} onChange={setEmail}
          onBlur={() => setTouched(p => ({ ...p, email: true }))}
          placeholder="you@example.com" autoComplete="email"
          error={emailError} touched={touched.email} required
        />
        <PasswordInput
          id="password" label="Password"
          value={password} onChange={setPassword}
          onBlur={() => setTouched(p => ({ ...p, password: true }))}
          show={showPassword} onToggleShow={() => setShowPassword(!showPassword)}
          error={passwordError} touched={touched.password} required
        />
        <div className="flex items-center justify-between">
          <button type="button" onClick={onMagicLink} className="text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation">
            Sign in with email link
          </button>
          <button type="button" onClick={onForgotPassword} className="text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation">
            Forgot password?
          </button>
        </div>

        {/* A11y live region */}
        <div aria-live="polite" className="sr-only">
          {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''} found. Please fix before continuing.`}
        </div>

        <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary mt-2" disabled={isLoading || socialLoading !== null}>
          {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Signing In...</> : 'Sign In'}
        </Button>

        {isSlowConnection && isLoading && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
            <WifiOff className="w-3 h-3" />
            This is taking longer than usual — please check your connection.
          </motion.p>
        )}
      </form>

      <SocialAuthButtons onGoogle={onGoogleSignIn} onApple={onAppleSignIn} disabled={isLoading || socialLoading !== null} socialLoading={socialLoading} />

      <div className="mt-6 text-center">
        <button type="button" onClick={onSwitchToSignup} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
          Don't have an account? Sign up
        </button>
      </div>
    </>
  );
}
