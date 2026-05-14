import { useState } from 'react';
import type { ElementType } from 'react';
import { Filter, Route, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsPanel } from './AnalyticsPanel';
import { OnboardingFunnelPanel } from './OnboardingFunnelPanel';
import { VisitorsPanel } from './VisitorsPanel';
import { LiveActivityPanel } from './LiveActivityPanel';

type GrowthTab = 'visitors' | 'analytics' | 'onboarding' | 'live';

const TABS: { id: GrowthTab; label: string; Icon: ElementType }[] = [
  { id: 'visitors',   label: 'Visitors',   Icon: Route },
  { id: 'analytics',  label: 'Analytics',  Icon: TrendingUp },
  { id: 'onboarding', label: 'Onboarding', Icon: Filter },
  { id: 'live',       label: 'Live',       Icon: Zap },
];

export function GrowthTrafficPanel() {
  const [activeTab, setActiveTab] = useState<GrowthTab>('visitors');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-white/50 hover:bg-white/5 hover:text-white',
            )}
          >
            <tab.Icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'visitors'   && <VisitorsPanel />}
      {activeTab === 'analytics'  && <AnalyticsPanel />}
      {activeTab === 'onboarding' && <OnboardingFunnelPanel />}
      {activeTab === 'live'       && <LiveActivityPanel />}
    </div>
  );
}
