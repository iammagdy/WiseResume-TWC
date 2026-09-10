import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale } from '@/i18n/LocaleProvider';

interface SettingsSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SettingsSearchInput({ value, onChange, className }: SettingsSearchInputProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
        <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('settings.searchPlaceholder', 'Search settings...')}
        className="ps-9 pe-12 bg-background border-border"
        aria-label={t('settings.searchLabel', 'Search settings')}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 end-0 w-8 h-8 my-auto me-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label={t('common.clear', 'Clear')}
        >
          <X className="w-4 h-4" />
        </Button>
      ) : (
        <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
          <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      )}
    </div>
  );
}
