import { useState, useEffect } from "react";
import { Toaster as Sonner, toast } from "sonner";

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
