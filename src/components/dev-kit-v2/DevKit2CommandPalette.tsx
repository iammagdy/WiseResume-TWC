import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HUB2_DEFS, type Hub2Id } from '@/lib/devkit-v2/devKit2HubConfig';

interface DevKit2CommandPaletteProps {
  onHubChange: (hub: Hub2Id) => void;
  onClose: () => void;
}

export function DevKit2CommandPalette({ onHubChange, onClose }: DevKit2CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = query.trim()
    ? HUB2_DEFS.filter(
        (h) =>
          h.label.toLowerCase().includes(query.toLowerCase()) ||
          h.description.toLowerCase().includes(query.toLowerCase()),
      )
    : HUB2_DEFS;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        onHubChange(results[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 backdrop-blur-sm px-3 pt-8 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search size={15} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to hub…"
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hubs match &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((hub, i) => {
              const Icon = hub.icon;
              const isHighlighted = i === selectedIndex;
              return (
                <button
                  key={hub.id}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    isHighlighted
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => {
                    onHubChange(hub.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon
                    size={15}
                    className={cn(isHighlighted ? 'text-primary' : 'text-muted-foreground/60')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hub.label}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate hidden sm:block">
                      {hub.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50">
                    Hub
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
