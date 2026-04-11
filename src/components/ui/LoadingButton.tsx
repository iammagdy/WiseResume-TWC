import * as React from 'react';
import { Button } from '@/components/ui/button';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  spinnerSize?: number;
}

/**
 * Standard async-action button with consistent loading UX:
 * - Shows MiniSpinner to the left of text while loading
 * - Changes button text to `loadingText` when provided; otherwise keeps original children
 * - Disabled while loading (also accepts additional `disabled` prop)
 */
export function LoadingButton({
  isLoading = false,
  loadingText,
  spinnerSize = 16,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const displayText = isLoading ? (loadingText ?? undefined) : undefined;

  return (
    <Button
      {...props}
      disabled={isLoading || disabled}
      className={cn('inline-flex items-center gap-2', className)}
    >
      {isLoading && <MiniSpinner size={spinnerSize} />}
      {displayText ?? children}
    </Button>
  );
}
