import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FormFieldProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children?: React.ReactNode;
}

interface InputFormFieldProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'none' | 'decimal';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  rightElement?: React.ReactNode;
  maxLength?: number;
  showCount?: boolean;
  prefix?: string;
}

interface TextareaFormFieldProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
}

function useSavedIndicator(value: string) {
  const [showSaved, setShowSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaved = useCallback(() => {
    if (value) {
      setShowSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
  }, [value]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { showSaved, triggerSaved };
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-success animate-fade-in ml-2">
      <CheckCircle2 className="w-3 h-3" />
      Saved
    </span>
  );
}

export function InputFormField({
  id,
  label,
  icon,
  error,
  touched,
  required,
  type = 'text',
  inputMode,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  rightElement,
  maxLength,
  showCount,
  prefix,
}: InputFormFieldProps) {
  const showError = touched && error;
  const inputRef = useRef<HTMLInputElement>(null);
  const { showSaved, triggerSaved } = useSavedIndicator(value);
  const isOverLimit = maxLength && value.length > maxLength;
  const showValidCheck = !showError && value && touched;
  const showClear = value && !showValidCheck;

  const handleBlur = () => {
    triggerSaved();
    onBlur?.();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
        <SavedBadge show={showSaved} />
      </Label>
      <div className="relative group">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-primary via-secondary to-accent opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
        <div className={cn('flex items-center', prefix && 'relative')}>
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none whitespace-nowrap z-10">
              {prefix}
            </span>
          )}
          <Input
            ref={inputRef}
            id={id}
            type={type}
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className={cn(
              'h-12 w-full',
              showError && 'border-destructive focus-visible:ring-destructive',
              (rightElement || (!rightElement && showClear)) && 'pr-14',
              showValidCheck && !rightElement && 'border-success/40',
              prefix && 'pl-[calc(var(--prefix-width,6rem)+1rem)]',
            )}
            style={prefix ? { '--prefix-width': `${prefix.length * 0.55}rem` } as React.CSSProperties : undefined}
            aria-invalid={showError ? 'true' : undefined}
            aria-describedby={showError ? `${id}-error` : undefined}
          />
        </div>
        {rightElement ? (
          <div className="absolute right-0 top-0 h-full flex items-center">
            {rightElement}
          </div>
        ) : showValidCheck ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
        ) : showClear ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        {showError ? (
          <p
            id={`${id}-error`}
            className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        ) : (
          <span />
        )}
        {showCount && maxLength && (
          <p
            className={cn(
              'text-xs sm:text-sm',
              isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

export function TextareaFormField({
  id,
  label,
  icon,
  error,
  touched,
  required,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 6,
  maxLength,
  showCount,
}: TextareaFormFieldProps) {
  const showError = touched && error;
  const isOverLimit = maxLength && value.length > maxLength;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showSaved, triggerSaved } = useSavedIndicator(value);

  const handleBlur = () => {
    triggerSaved();
    onBlur?.();
  };

  const handleClear = () => {
    onChange('');
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
        <SavedBadge show={showSaved} />
      </Label>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          id={id}
          dir="auto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            'resize-none min-h-[120px] sm:min-h-[80px]',
            showError && 'border-destructive focus-visible:ring-destructive',
            value && 'pr-10',
          )}
          aria-invalid={showError ? 'true' : undefined}
          aria-describedby={showError ? `${id}-error` : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1 min-w-[48px] min-h-[48px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        {showError ? (
          <p
            id={`${id}-error`}
            className="flex items-center gap-1.5 text-sm text-destructive animate-fade-in"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        ) : (
          <span />
        )}
        {showCount && maxLength && (
          <p
            className={cn(
              'text-xs sm:text-sm',
              isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
