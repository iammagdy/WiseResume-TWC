import { motion } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';

type AuthMethod = 'email' | 'phone';

interface AuthMethodToggleProps {
  value: AuthMethod;
  onChange: (method: AuthMethod) => void;
}

export function AuthMethodToggle({ value, onChange }: AuthMethodToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl glass-surface w-fit mx-auto mb-6">
      {(['email', 'phone'] as const).map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className="relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px]"
        >
          {value === method && (
            <motion.div
              layoutId="auth-method-pill"
              className="absolute inset-0 rounded-lg gradient-primary"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-2 ${value === method ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {method === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {method === 'email' ? 'Email' : 'Phone'}
          </span>
        </button>
      ))}
    </div>
  );
}
