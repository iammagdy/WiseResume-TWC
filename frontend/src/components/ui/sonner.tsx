import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={true}
      richColors={false}
      duration={4000}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] drop-shadow-[0_0_6px_hsl(var(--success)/0.5)]" />,
        error: <XCircle className="h-5 w-5 text-[hsl(var(--destructive))] drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]" />,
        warning: <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] drop-shadow-[0_0_6px_hsl(var(--warning)/0.5)]" />,
        info: <Info className="h-5 w-5 text-[hsl(var(--secondary))] drop-shadow-[0_0_6px_hsl(var(--secondary)/0.5)]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast toast-premium group-[.toaster]:text-foreground group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-medium group-[.toast]:shadow-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          closeButton:
            "group-[.toast]:!bg-background/60 group-[.toast]:!border-border/40 group-[.toast]:!text-muted-foreground group-[.toast]:hover:!bg-muted group-[.toast]:!rounded-full group-[.toast]:!h-6 group-[.toast]:!w-6 group-[.toast]:transition-colors",
          success: "toast-success-accent",
          error: "toast-error-accent",
          warning: "toast-warning-accent",
          info: "toast-info-accent",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
