import { useRef } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { InputFormField } from '@/components/ui/form-field';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  show: boolean;
  onToggleShow: () => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  show,
  onToggleShow,
  error,
  touched,
  required,
  autoComplete = 'current-password',
  placeholder = '••••••••',
}: PasswordInputProps) {
  return (
    <InputFormField
      id={id}
      label={label}
      type={show ? 'text' : 'password'}
      icon={<Lock className="w-4 h-4" />}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      autoComplete={autoComplete}
      error={error}
      touched={touched}
      required={required}
      rightElement={
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      }
    />
  );
}
