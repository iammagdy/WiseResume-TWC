import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.5)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.3)]",
        outline: "border border-border/50 glass-surface hover:border-primary/40 hover:bg-primary/5 active:bg-primary/10",
        secondary: "glass-elevated text-secondary-foreground hover:bg-secondary/20 active:bg-secondary/30",
        ghost: "hover:glass-surface hover:border-border/30 active:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]",
        sm: "h-10 rounded-lg px-3 min-h-[40px]",
        lg: "h-14 rounded-xl px-8 min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
