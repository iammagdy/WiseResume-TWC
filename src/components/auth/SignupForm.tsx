import { useState } from 'react';
import { Mail, User, Phone, WifiOff, ArrowLeft } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [step, setStep] = useState<1 | 2>(1);
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
  const confirmError = getConfirmError();
  const fullNameError = getFullNameError();
  const phoneError = getPhoneError();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(p => ({ ...p, email: true, password: true, confirmPassword: true }));
    const errors = [emailError, passwordError, confirmError].filter(Boolean).length;
    setErrorCount(errors);
    if (errors > 0) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(p => ({ ...p, fullName: true, phoneNumber: true }));
    const errors = [fullNameError, phoneError].filter(Boolean).length;
    setErrorCount(errors);
    if (errors > 0) return;
    await onSubmit(email, password, fullName, phoneNumber);
  };

  // Variants for sliding animation
  const slideVariants = {
    hiddenRight: { opacity: 0, x: 20 },
    hiddenLeft: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
    exitRight: { opacity: 0, x: 20, transition: { duration: 0.2, ease: 'easeIn' as const } },
    exitLeft: { opacity: 0, x: -20, transition: { duration: 0.2, ease: 'easeIn' as const } },
  };

  return (
    <div className="overflow-hidden">
      {step === 2 && (
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors touch-manipulation"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" /> Back to email
        </button>
      )}

      {/* A11y live region */}
      <div aria-live="polite" className="sr-only">
        {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''} found. Please fix before continuing.`}
        Step {step} of 2.
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step1"
            variants={slideVariants}
            initial="hiddenLeft"
            animate="visible"
            exit="exitLeft"
            onSubmit={handleNextStep}
            className="space-y-4"
          >
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

            <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary mt-2">
              Continue
            </Button>

            <SocialAuthButtons onGoogle={onGoogleSignIn} onApple={onAppleSignIn} disabled={isLoading || socialLoading !== null} socialLoading={socialLoading} />

            <div className="mt-6 text-center">
              <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
                Already have an account? Sign in
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="step2"
            variants={slideVariants}
            initial="hiddenRight"
            animate="visible"
            exit="exitRight"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="mb-2">
              <h3 className="font-semibold text-lg">Almost there!</h3>
              <p className="text-sm text-muted-foreground">Tell us a bit about yourself to personalize your experience.</p>
            </div>

            <InputFormField
              id="fullName" label="Full Name" type="text"
              icon={<User className="w-4 h-4" />}
              value={fullName} onChange={setFullName}
              onBlur={() => setTouched(p => ({ ...p, fullName: true }))}
              placeholder="John Doe" autoComplete="name"
              error={fullNameError} touched={touched.fullName} required
            />
            <InputFormField
              id="phoneNumber" label="Phone Number (Optional)" type="tel" inputMode="tel"
              icon={<Phone className="w-4 h-4" />}
              value={phoneNumber} onChange={setPhoneNumber}
              onBlur={() => setTouched(p => ({ ...p, phoneNumber: true }))}
              placeholder="+1 (555) 123-4567" autoComplete="tel"
              error={phoneError} touched={touched.phoneNumber}
            />

            <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary mt-2" disabled={isLoading}>
              {isLoading ? <><MiniSpinner size={20} className="mr-2" />Creating Account...</> : 'Create Account'}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3 leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
            </p>

            {isSlowConnection && isLoading && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center mt-4">
                <WifiOff className="w-3 h-3" />
                This is taking longer than usual — please check your connection.
              </motion.p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
