import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={true}
      richColors={true}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-elevated group-[.toaster]:text-foreground group-[.toaster]:border-primary/20 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:font-medium group-[.toast]:shadow-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          closeButton:
            "group-[.toast]:bg-background/80 group-[.toast]:border-border group-[.toast]:text-foreground group-[.toast]:hover:bg-muted group-[.toast]:transition-colors",
          success:
            "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10",
          warning:
            "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/10",
          info:
            "group-[.toaster]:border-secondary/30 group-[.toaster]:bg-secondary/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
