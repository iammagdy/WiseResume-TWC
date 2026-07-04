/**
 * DevKit2Shell.tsx
 *
 * Root layout for /devkit2.
 * Manages: hub navigation, mobile menu, command palette, integration map modal.
 * Reuses: DevKitSessionContext (session lock/countdown).
 * No mock data. No backend calls beyond what the active hub initiates.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDevKitSession } from '@/contexts/DevKitSessionContext';
import { DevKit2Sidebar } from './DevKit2Sidebar';
import { DevKit2TopBar } from './DevKit2TopBar';
import { DevKit2CommandPalette } from './DevKit2CommandPalette';
import { CommandHomeHub } from './hubs/CommandHomeHub';
import { SystemHealthHub } from './hubs/SystemHealthHub';
import { UsersAccountsHub } from './hubs/UsersAccountsHub';
import { AIOperationsHub } from './hubs/AIOperationsHub';
import { GrowthAnalyticsHub } from './hubs/GrowthAnalyticsHub';
import { BusinessOpsHub } from './hubs/BusinessOpsHub';
import { DeveloperOpsHub } from './hubs/DeveloperOpsHub';
import {
  INTEGRATION_MAP,
  type Integration2Mapping,
} from '@/lib/devkit-v2/devKit2IntegrationMap';
import type { Hub2Id } from '@/lib/devkit-v2/devKit2HubConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Integration Map Modal ────────────────────────────────────────────────────

function IntegrationMapModal({ onClose }: { onClose: () => void }) {
  const grouped = INTEGRATION_MAP.reduce<Record<string, Integration2Mapping[]>>((acc, m) => {
    if (!acc[m.hub]) acc[m.hub] = [];
    acc[m.hub].push(m);
    return acc;
  }, {});

  const step1StatusLabel: Record<Integration2Mapping['step1Status'], string> = {
    'live-readonly': 'Live · Step 1',
    'placeholder': 'Step 2',
    'disabled-dangerous': 'Disabled · Dangerous',
  };
  const step1StatusColor: Record<Integration2Mapping['step1Status'], string> = {
    'live-readonly': 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    'placeholder': 'text-muted-foreground border-border bg-muted',
    'disabled-dangerous': 'text-red-400 border-red-500/20 bg-red-500/10',
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 pt-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Integration Map</h2>
              <p className="text-xs text-muted-foreground">
                Complete hub → action cross-reference for DevKit2 migration
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
          <span className="text-xs text-muted-foreground font-medium">Legend:</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Live · Step 1
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Step 2
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            Disabled · Dangerous
          </span>
        </div>

        {/* Grouped by hub */}
        <div className="p-6 space-y-6">
          {Object.entries(grouped).map(([hub, entries]) => (
            <Card key={hub}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{hub}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Tab / Panel</th>
                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Function</th>
                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Action</th>
                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {entries.map((m, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 text-foreground/80">{m.tab ?? m.currentPanelId}</td>
                          <td className="px-4 py-2 font-mono text-muted-foreground">{m.functionId}</td>
                          <td className="px-4 py-2 font-mono text-foreground/70">{m.action}</td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[9px] font-semibold',
                                step1StatusColor[m.step1Status],
                              )}
                            >
                              {step1StatusLabel[m.step1Status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function DevKit2Shell() {
  const { user } = useAuth();
  const { lock, secondsUntilLock } = useDevKitSession();

  const [activeHub, setActiveHub] = useState<Hub2Id>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [integrationMapOpen, setIntegrationMapOpen] = useState(false);

  // Cmd+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setIntegrationMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const renderHub = () => {
    switch (activeHub) {
      case 'home':
        return (
          <CommandHomeHub
            onHubChange={setActiveHub}
            showIntegrationMap={integrationMapOpen}
            onOpenIntegrationMap={() => setIntegrationMapOpen(true)}
          />
        );
      case 'health':
        return <SystemHealthHub />;
      case 'users':
        return <UsersAccountsHub />;
      case 'ai':
        return <AIOperationsHub />;
      case 'growth':
        return <GrowthAnalyticsHub />;
      case 'business':
        return <BusinessOpsHub />;
      case 'devops':
        return <DeveloperOpsHub />;
      default:
        return <CommandHomeHub onHubChange={setActiveHub} showIntegrationMap={false} onOpenIntegrationMap={() => setIntegrationMapOpen(true)} />;
    }
  };

  return (
    <div id="dev-kit2-root" className="flex h-screen min-h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <DevKit2Sidebar
        activeHub={activeHub}
        onHubChange={setActiveHub}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenIntegrationMap={() => setIntegrationMapOpen(true)}
        onLock={lock}
        secondsUntilLock={secondsUntilLock}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main area */}
      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">
        <DevKit2TopBar
          activeHub={activeHub}
          adminEmail={user?.email ?? ''}
          secondsUntilLock={secondsUntilLock}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHub}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {renderHub()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Command palette */}
      {commandPaletteOpen && (
        <DevKit2CommandPalette
          onHubChange={(hub) => {
            setActiveHub(hub);
            setCommandPaletteOpen(false);
          }}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}

      {/* Integration map modal */}
      {integrationMapOpen && (
        <IntegrationMapModal onClose={() => setIntegrationMapOpen(false)} />
      )}
    </div>
  );
}
