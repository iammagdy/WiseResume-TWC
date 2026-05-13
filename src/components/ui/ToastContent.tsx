import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "default";

interface ToastContentProps {
  type?: ToastType;
  title: string;
  description?: string;
}

const BASE_BG = "#161618";
const TEXT_PRIMARY = "#e8e8ec";
const TEXT_MUTED = "#8b8b99";

const config: Record<
  ToastType,
  {
    icon: React.ReactNode;
    iconColor: string;
    bar: string;
    iconBg: string;
    overlay: string;
    border: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={17} />,
    iconColor: "#22c55e",
    bar: "linear-gradient(180deg, #22c55e 0%, rgba(34,197,94,0.2) 100%)",
    iconBg: "rgba(34,197,94,0.12)",
    overlay: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.22)",
  },
  error: {
    icon: <XCircle size={17} />,
    iconColor: "#ef4444",
    bar: "linear-gradient(180deg, #ef4444 0%, rgba(239,68,68,0.2) 100%)",
    iconBg: "rgba(239,68,68,0.12)",
    overlay: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.22)",
  },
  warning: {
    icon: <AlertTriangle size={17} />,
    iconColor: "#f59e0b",
    bar: "linear-gradient(180deg, #f59e0b 0%, rgba(245,158,11,0.2) 100%)",
    iconBg: "rgba(245,158,11,0.12)",
    overlay: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.22)",
  },
  info: {
    icon: <Info size={17} />,
    iconColor: "#8b1a2f",
    bar: "linear-gradient(180deg, #8b1a2f 0%, rgba(139,26,47,0.2) 100%)",
    iconBg: "rgba(139,26,47,0.12)",
    overlay: "rgba(139,26,47,0.07)",
    border: "rgba(139,26,47,0.22)",
  },
  default: {
    icon: <Info size={17} />,
    iconColor: "#8b8b99",
    bar: "linear-gradient(180deg, rgba(139,139,153,0.5) 0%, rgba(139,139,153,0.08) 100%)",
    iconBg: "rgba(139,139,153,0.1)",
    overlay: "rgba(255,255,255,0.02)",
    border: "rgba(255,255,255,0.08)",
  },
};

export function ToastContent({ type = "default", title, description }: ToastContentProps) {
  const c = config[type];

  return (
    <div
      className="wr-toast"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "12px",
        width: "356px",
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        padding: "14px 18px 14px 22px",
        borderRadius: "16px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: BASE_BG,
        border: `1px solid ${c.border}`,
        boxShadow: [
          "0 2px 8px rgba(0,0,0,0.35)",
          "0 16px 48px rgba(0,0,0,0.45)",
          "inset 0 1px 0 rgba(255,255,255,0.06)",
        ].join(", "),
        fontFamily: "inherit",
        fontSize: "0.875rem",
        color: TEXT_PRIMARY,
        cursor: "default",
        animation: "wr-toast-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* Per-type color overlay */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: c.overlay,
          pointerEvents: "none",
          borderRadius: "16px",
        }}
      />

      {/* Gradient left accent bar */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: c.bar,
          borderRadius: "16px 0 0 16px",
          pointerEvents: "none",
        }}
      />

      {/* Icon with circular backdrop */}
      <span
        style={{
          position: "relative",
          flexShrink: 0,
          width: "30px",
          height: "30px",
          minWidth: "30px",
          borderRadius: "50%",
          background: c.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "0px",
          color: c.iconColor,
        }}
      >
        {c.icon}
      </span>

      {/* Text content */}
      <span style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, paddingTop: "1px" }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.875rem",
            color: TEXT_PRIMARY,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              fontSize: "0.75rem",
              color: TEXT_MUTED,
              lineHeight: 1.45,
              marginTop: "3px",
            }}
          >
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
