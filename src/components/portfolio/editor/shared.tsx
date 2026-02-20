import React from 'react';
import { ChevronDown } from 'lucide-react';

export function CollapsibleCard({
  id, icon, title, hint, openSections, toggleSection, children, action,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const isOpen = openSections.has(id);
  return (
    <div id={`section-${id}`} className="glass-elevated rounded-2xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 text-left active:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-primary shrink-0">{icon}</span>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {!isOpen && hint && (
            <span className="text-xs text-muted-foreground truncate ml-1">{hint}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {action && !isOpen && action}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function SubSectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 border-t border-border/30 mt-2 first:mt-0 first:border-t-0 first:pt-0">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
