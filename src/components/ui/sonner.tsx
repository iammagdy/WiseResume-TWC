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
          success: <CheckCircle2 size={17} style={{ color: "#22c55e" }} />,
          error: <XCircle size={17} style={{ color: "#ef4444" }} />,
          warning: <AlertTriangle size={17} style={{ color: "#f59e0b" }} />,
          info: <Info size={17} style={{ color: "#8b1a2f" }} />,
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

const baseStyle: React.CSSProperties = {
  borderRadius: "16px",
  padding: "14px 18px 14px 22px",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  color: "#e8e8ec",
  position: "relative",
  overflow: "hidden",
};

const typeStyle: Record<string, React.CSSProperties> = {
  success: {
    background: "#161e18",
    border: "1px solid rgba(34,197,94,0.25)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  error: {
    background: "#1e1616",
    border: "1px solid rgba(239,68,68,0.25)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  warning: {
    background: "#1e1b14",
    border: "1px solid rgba(245,158,11,0.25)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  info: {
    background: "#16181e",
    border: "1px solid rgba(139,26,47,0.25)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  default: {
    background: "#161618",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
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
