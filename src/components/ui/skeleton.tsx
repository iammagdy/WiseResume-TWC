import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
   return (
     <div
       className={cn(
         "relative overflow-hidden rounded-lg bg-muted",
         "before:absolute before:inset-0 before:-translate-x-full",
         "before:animate-[shimmer_2s_infinite]",
         "before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
         className
       )}
       style={{ willChange: 'transform' }}
       {...props}
     />
   );
}

export { Skeleton };
