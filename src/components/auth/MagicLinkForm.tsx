import { useState } from 'react';
import { Mail, Loader2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputFormField } from '@/components/ui/form-field';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');

interface MagicLinkFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  isSlowConnection: boolean;
}

export function MagicLinkForm({ onSubmit, onBackToLogin, isLoading, isSlowConnection }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const getEmailError = () => {
    if (!email) return 'Email is required';
    try { emailSchema.parse(email); return undefined; }
    catch (e) { return e instanceof z.ZodError ? e.errors[0]?.message : 'Invalid email'; }
  };

  const emailError = getEmailError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError) return;
    await onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputFormField
        id="magic-link-email" label="Email" type="email"
        icon={<Mail className="w-4 h-4" />}
        value={email} onChange={setEmail}
        onBlur={() => setTouched(true)}
        placeholder="you@example.com" autoComplete="email"
        error={emailError} touched={touched} required
      />

      <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold gradient-primary glow-primary" disabled={isLoading}>
        {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sending...</> : 'Send Magic Link'}
      </Button>

      {isSlowConnection && isLoading && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center">
          <WifiOff className="w-3 h-3" />
          This is taking longer than usual — please check your connection.
        </motion.p>
      )}

      <div className="text-center">
        <button type="button" onClick={onBackToLogin} className="text-primary hover:underline text-sm min-h-[44px] touch-manipulation">
          Back to Sign In
        </button>
      </div>
    </form>
  );
}
