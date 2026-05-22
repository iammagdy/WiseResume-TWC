import { Toaster as Sonner, toast as sonnerToast } from "sonner";
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
    <div role="log" aria-live="polite" aria-atomic="false" aria-label="Notifications">
      <Sonner
        theme={resolvedTheme as ToasterProps["theme"]}
        className="toaster group"
        position="top-center"
        closeButton={false}
        richColors={false}
        expand={true}
        visibleToasts={3}
        duration={3000}
        gap={10}
        icons={{
          success: <CheckCircle2 size={17} className="text-success" />,
          error: <XCircle size={17} className="text-destructive" />,
          warning: <AlertTriangle size={17} className="text-warning" />,
          info: <Info size={17} className="text-info" />,
        }}
        toastOptions={{
          classNames: {
            toast: "wr-toast",
            title: "wr-toast-title",
            description: "wr-toast-desc",
          },
        }}
        {...props}
      />
    </div>
  );
};

type ToastMessage = string | React.ReactNode;
type ToastOptions = Parameters<typeof sonnerToast>[1];

const DURATION = 3500;

const toastShadow =
  "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)";

const baseStyle: React.CSSProperties = {
  borderRadius: "16px",
  padding: "14px 18px 14px 22px",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  color: "hsl(var(--popover-foreground))",
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  boxShadow: toastShadow,
  position: "relative",
  overflow: "hidden",
};

const typeStyle: Record<string, React.CSSProperties> = {
  success: {
    border: "1px solid hsl(var(--success) / 0.3)",
  },
  error: {
    border: "1px solid hsl(var(--destructive) / 0.3)",
  },
  warning: {
    border: "1px solid hsl(var(--warning) / 0.3)",
  },
  info: {
    border: "1px solid hsl(var(--info) / 0.3)",
  },
  default: {},
};

const toast = Object.assign(
  (message: ToastMessage, opts?: ToastOptions) => {
    return sonnerToast(message, {
      ...opts,
      style: { ...baseStyle, ...typeStyle.default, ...opts?.style },
    });
  },
  {
    success: (message: ToastMessage, opts?: ToastOptions) =>
      sonnerToast.success(message, {
        ...opts,
        style: { ...baseStyle, ...typeStyle.success, ...opts?.style },
      }),
    error: (message: ToastMessage, opts?: ToastOptions) =>
      sonnerToast.error(message, {
        ...opts,
        style: { ...baseStyle, ...typeStyle.error, ...opts?.style },
      }),
    warning: (message: ToastMessage, opts?: ToastOptions) =>
      sonnerToast.warning(message, {
        ...opts,
        style: { ...baseStyle, ...typeStyle.warning, ...opts?.style },
      }),
    info: (message: ToastMessage, opts?: ToastOptions) =>
      sonnerToast.info(message, {
        ...opts,
        style: { ...baseStyle, ...typeStyle.info, ...opts?.style },
      }),
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
    message: sonnerToast.message,
  }
);

export { Toaster, toast };
