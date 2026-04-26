import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const storeTheme = useSettingsStore((s) => s.theme);
  const resolvedTheme: "light" | "dark" =
    storeTheme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : storeTheme;

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={false}
      richColors={false}
      visibleToasts={3}
      duration={3000}
      gap={8}
      icons={{
        success: <CheckCircle2 className="w-[18px] h-[18px] text-success shrink-0" />,
        error: <XCircle className="w-[18px] h-[18px] text-destructive shrink-0" />,
        warning: <AlertTriangle className="w-[18px] h-[18px] text-warning shrink-0" />,
        info: <Info className="w-[18px] h-[18px] text-primary shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast: "toast-card",
          title: "toast-card-title",
          description: "toast-card-description",
          success: "toast-card--success",
          error: "toast-card--error",
          warning: "toast-card--warning",
          info: "toast-card--info",
          icon: "toast-card-icon",
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
