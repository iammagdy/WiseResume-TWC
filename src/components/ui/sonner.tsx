import { useState, useEffect } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("theme") as "light" | "dark" | "system") || "dark";
  });

  useEffect(() => {
    const handleStorage = () => {
      setTheme((localStorage.getItem("theme") as "light" | "dark" | "system") || "dark");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={true}
      richColors={false}
      duration={4000}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />,
        error: <XCircle className="h-5 w-5 text-[hsl(var(--destructive))]" />,
        warning: <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />,
        info: <Info className="h-5 w-5 text-[hsl(var(--secondary))]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast toast-premium group-[.toaster]:text-foreground",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
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
