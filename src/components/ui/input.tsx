import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        autoCapitalize="words"
        autoCorrect="on"
        spellCheck={true}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl glass-input px-3 py-2 text-[16px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation transition-all",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
