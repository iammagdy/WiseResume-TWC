import { Toaster as Sonner, toast } from "sonner";
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
        success: <span className="toast-dot toast-dot-success" />,
        error: <span className="toast-dot toast-dot-error" />,
        warning: <span className="toast-dot toast-dot-warning" />,
        info: <span className="toast-dot toast-dot-info" />,
      }}
      toastOptions={{
        classNames: {
          toast: "toast-pill",
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
