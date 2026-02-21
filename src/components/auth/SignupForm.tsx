import { useState } from 'react';
import { Mail, User, Phone, Loader2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputFormField } from '@/components/ui/form-field';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { SocialAuthButtons } from './SocialAuthButtons';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const signupPasswordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number');

interface SignupFormProps {
  onSubmit: (email: string, password: string, fullName: string, phoneNumber: string) => Promise<void>;
  onSwitchToLogin: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  isLoading: boolean;
  isSlowConnection: boolean;
  socialLoading: 'google' | 'apple' | null;
}

export function SignupForm({
  onSubmit, onSwitchToLogin,
  onGoogleSignIn, onAppleSignIn,
  isLoading, isSlowConnection, socialLoading,
}: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false, fullName: false, phoneNumber: false });
  const [errorCount, setErrorCount] = useState(0);

  const getEmailError = () => {
    if (!email) return 'Email is required';
    try { emailSchema.parse(email); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid email'; }
  };
  const getPasswordError = () => {
    if (!password) return 'Password is required';
    try { signupPasswordSchema.parse(password); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid password'; }
  };
  const getFullNameError = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (fullName.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };
  const getPhoneError = () => {
    if (!phoneNumber) return undefined;
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleaned)) return 'Please enter a valid phone number';
    return undefined;
  };
  const getConfirmError = () => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return undefined;
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();
  const fullNameError = getFullNameError();
  const phoneError = getPhoneError();
  const confirmError = getConfirmError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true, fullName: true, phoneNumber: true });
    const errors = [emailError, passwordError, fullNameError, phoneError, confirmError].filter(Boolean).length;
    setErrorCount(errors);
    if (errors > 0) return;
    await onSubmit(email, password, fullName, phoneNumber);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputFormField
          id="fullName" label="Full Name" type="text"
          icon={<User className="w-4 h-4" />}
          value={fullName} onChange={setFullName}
          onBlur={() => setTouched(p => ({ ...p, fullName: true }))}
          placeholder="John Doe" autoComplete="name"
          error={fullNameError} touched={touched.fullName} required
        />
        <InputFormField
          id="phoneNumber" label="Phone Number" type="tel" inputMode="tel"
          icon={<Phone className="w-4 h-4" />}
          value={phoneNumber} onChange={setPhoneNumber}
          onBlur={() => setTouched(p => ({ ...p, phoneNumber: true }))}
          placeholder="+1 (555) 123-4567" autoComplete="tel"
          error={phoneError} touched={touched.phoneNumber}
        />
        <InputFormField
          id="email" label="Email" type="email"
          icon={<Mail className="w-4 h-4" />}
          value={email} onChange={setEmail}
          onBlur={() => setTouched(p => ({ ...p, email: true }))}
          placeholder="you@example.com" autoComplete="email"
          error={emailError} touched={touched.email} required
        />
        <div>
          <PasswordInput
            id="password" label="Password"
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
          id="confirmPassword" label="Confirm Password"
          value={confirmPassword} onChange={setConfirmPassword}
          onBlur={() => setTouched(p => ({ ...p, confirmPassword: true }))}
          show={showConfirmPassword} onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
          autoComplete="new-password"
          error={confirmError} touched={touched.confirmPassword} required
        />

        {/* A11y live region */}
        <div aria-live="polite" className="sr-only">
          {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''} found. Please fix before continuing.`}
        </div>

        <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary mt-2" disabled={isLoading || socialLoading !== null}>
          {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating Account...</> : 'Create Account'}
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
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
          Already have an account? Sign in
        </button>
      </div>
    </>
  );
}
