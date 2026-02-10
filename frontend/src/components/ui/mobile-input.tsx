import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface MobileInputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      className,
      type,
      label,
      error,
      success,
      icon,
      rightIcon,
      onClear,
      showClear = true,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!value);
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!, []);

    // Track if input has value for floating label
    React.useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      haptics.light();
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      if (inputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(inputRef.current, '');
        
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
        inputRef.current.focus();
      }
      haptics.light();
    };

    const showLabel = label && (isFocused || hasValue);
    const showClearButton = showClear && hasValue && onClear;

    return (
      <div className="relative w-full">
        {/* Floating label */}
        {label && (
          <motion.label
            className={cn(
              "absolute left-4 pointer-events-none transition-colors z-10",
              "text-muted-foreground",
              isFocused && "text-primary",
              error && "text-destructive",
              success && "text-success"
            )}
            initial={false}
            animate={{
              y: showLabel ? -24 : 14,
              scale: showLabel ? 0.85 : 1,
              x: showLabel ? -4 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {label}
          </motion.label>
        )}

        {/* Input container */}
        <div className="relative flex items-center">
          {/* Left icon */}
          {icon && (
            <span
              className={cn(
                "absolute left-4 transition-colors",
                isFocused ? "text-primary" : "text-muted-foreground",
                error && "text-destructive"
              )}
            >
              {icon}
            </span>
          )}

          {/* Input */}
          <input
            type={type}
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "flex h-14 w-full rounded-xl px-4 py-3 text-base",
              "bg-card/50 border-2 transition-all duration-200",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none touch-manipulation",
              // Default state
              "border-border/50",
              // Focused state
              isFocused && "border-primary bg-card/80 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]",
              // Error state
              error && "border-destructive focus:border-destructive focus:shadow-[0_0_0_4px_hsl(var(--destructive)/0.1)]",
              // Success state
              success && "border-success focus:border-success focus:shadow-[0_0_0_4px_hsl(var(--success)/0.1)]",
              // With icons
              icon && "pl-12",
              (rightIcon || showClearButton) && "pr-12",
              // Label spacing
              label && "pt-5 pb-1",
              className
            )}
            {...props}
          />

          {/* Clear button */}
          {showClearButton && (
            <motion.button
              type="button"
              className={cn(
                "absolute right-4 w-6 h-6 rounded-full",
                "bg-muted/80 flex items-center justify-center",
                "text-muted-foreground hover:text-foreground",
                "touch-manipulation active:scale-90 transition-transform"
              )}
              onClick={handleClear}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.85 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 4.586L10.293.293l1.414 1.414L7.414 6l4.293 4.293-1.414 1.414L6 7.414l-4.293 4.293-1.414-1.414L4.586 6 .293 1.707 1.707.293 6 4.586z" />
              </svg>
            </motion.button>
          )}

          {/* Right icon */}
          {rightIcon && !showClearButton && (
            <span
              className={cn(
                "absolute right-4 transition-colors",
                isFocused ? "text-primary" : "text-muted-foreground"
              )}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            className="mt-1.5 text-sm text-destructive flex items-center gap-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zm.75-8.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zM7 10.5a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = "MobileInput";

export { MobileInput };
