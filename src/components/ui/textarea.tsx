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
        // B14: field-sizing:content lets the textarea auto-grow with its content
        // (supported browsers) so long bullets/summaries no longer scroll inside a
        // fixed 100px box; gracefully ignored where unsupported.
        "flex min-h-[100px] w-full rounded-xl border border-border bg-input px-3 py-2 text-[16px] leading-relaxed ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation transition-all duration-200 [field-sizing:content]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
