import React from 'react';
import { cn } from '@/lib/utils';
import { Compass, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HUB2_DEFS, type Hub2Id } from '@/lib/devkit-v2/devKit2HubConfig';

interface DevKit2SidebarProps {
  activeHub: Hub2Id;
  onHubChange: (hub: Hub2Id) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenIntegrationMap: () => void;
  onLock: () => void;
  secondsUntilLock: number | null;
  onOpenCommandPalette: () => void;
}

function SidebarContent({
  activeHub,
  onHubChange,
  onCloseMobile,
  onOpenIntegrationMap,
  onLock,
  secondsUntilLock,
  onOpenCommandPalette,
}: DevKit2SidebarProps) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            WR
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-foreground">WiseResume</span>
            <span className="text-[10px] font-mono text-primary">devkit v2</span>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {HUB2_DEFS.map((hub) => {
          const Icon = hub.icon;
          const isActive = activeHub === hub.id;
          return (
            <button
              key={hub.id}
              onClick={() => {
                onHubChange(hub.id);
                onCloseMobile();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent',
              )}
            >
              <Icon
                size={16}
                className={cn(isActive ? 'text-primary' : 'text-muted-foreground/70')}
              />
              <span>{hub.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-border p-3">
        {secondsUntilLock !== null && (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-[10px] font-mono text-muted-foreground">
            Auto-lock in {Math.ceil(secondsUntilLock / 60)}m
          </div>
        )}

        {/* Command palette trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="font-medium">Jump to hub…</span>
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">⌘K</kbd>
        </button>

        {/* Integration map */}
        <button
          type="button"
          onClick={onOpenIntegrationMap}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Compass size={13} className="text-amber-400" />
          <span className="font-medium">Integration Map</span>
        </button>

        {/* Lock */}
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
          onClick={onLock}
        >
          <Lock size={14} className="mr-2" />
          Terminate Session
        </Button>

        <p className="text-center text-[10px] font-mono text-muted-foreground/50 pb-1">
          DevKit v2 · Preview
        </p>
      </div>
    </div>
  );
}

export function DevKit2Sidebar(props: DevKit2SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-20">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile backdrop */}
      {props.isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={props.onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 flex-col transition-transform duration-200 lg:hidden',
          props.isOpenMobile ? 'flex translate-x-0' : 'hidden -translate-x-full',
        )}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  );
}
