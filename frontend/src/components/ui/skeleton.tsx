 import { cn } from "@/lib/utils";
 
 /**
  * Premium shimmer effect for loading states
  * Provides a more polished, app-store-ready appearance
  */

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
   return (
     <div
       className={cn(
         "relative overflow-hidden rounded-md bg-muted",
         "before:absolute before:inset-0 before:-translate-x-full",
         "before:animate-[shimmer_2s_infinite]",
         "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
         className
       )}
       style={{ willChange: 'transform' }}
       {...props}
     />
   );
}

export { Skeleton };
