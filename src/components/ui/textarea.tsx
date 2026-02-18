import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
      <textarea
        spellCheck={true}
        autoCorrect="on"
        autoCapitalize="sentences"
        className={cn(
        "flex min-h-[120px] sm:min-h-[80px] w-full rounded-xl glass-input px-3 py-2 text-[16px] leading-relaxed ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
