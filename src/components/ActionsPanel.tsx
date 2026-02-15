import React from "react";
import {
  FloatingPanelRoot,
  FloatingPanelTrigger,
  FloatingPanelContent,
  FloatingPanelBody,
  FloatingPanelButton,
} from "@/components/ui/floating-panel";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

// ── Types ──────────────────────────────────────────────

export interface ActionsPanelAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "ghost" | "destructive";
  onClick: () => void;
}

export interface ActionsPanelGroup {
  id: string;
  title?: string;
  actions: ActionsPanelAction[];
}

export interface ActionsPanelProps {
  /** The element that opens the panel */
  trigger: React.ReactNode;
  /** Optional header title displayed inside the panel */
  title?: string;
  /** Grouped action items */
  groups: ActionsPanelGroup[];
  /** Extra className on the trigger wrapper */
  triggerClassName?: string;
}

// ── Component ──────────────────────────────────────────

export function ActionsPanel({
  trigger,
  title,
  groups,
  triggerClassName,
}: ActionsPanelProps) {
  return (
    <FloatingPanelRoot>
      <FloatingPanelTrigger title={title ?? ""} className={triggerClassName}>
        {trigger}
      </FloatingPanelTrigger>

      <FloatingPanelContent
        className={cn(
          "w-[calc(100vw-2rem)] max-w-md",
          "max-h-[80dvh] overflow-y-auto",
          "pb-safe",
          "backdrop-blur-xl bg-background/95 border-border/40"
        )}
      >
        <FloatingPanelBody className="p-2 space-y-1">
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.id}>
              {groupIndex > 0 && <Separator className="my-1" />}

              {group.title && (
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </p>
              )}

              {group.actions.map((action) => {
                const Icon = action.icon;
                const isDestructive = action.variant === "destructive";

                return (
                  <FloatingPanelButton
                    key={action.id}
                    className={cn(
                      "min-h-[44px] w-full justify-start touch-manipulation rounded-lg transition-transform active:scale-95",
                      isDestructive && "text-destructive hover:bg-destructive/10"
                    )}
                    onClick={() => {
                      haptics.light();
                      action.onClick();
                    }}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isDestructive
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      />
                    )}
                    <span className="truncate">{action.label}</span>
                  </FloatingPanelButton>
                );
              })}
            </React.Fragment>
          ))}
        </FloatingPanelBody>
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
}

export default ActionsPanel;
