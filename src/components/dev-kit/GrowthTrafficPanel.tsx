import { useState } from 'react';
import type { ElementType } from 'react';
import { Filter, Route, TrendingUp, Zap } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { OnboardingFunnelPanel } from './OnboardingFunnelPanel';
import { VisitorsPanel } from './VisitorsPanel';
import { LiveActivityPanel } from './LiveActivityPanel';
import { DevKitTabBar } from './DevKitUI';

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
      <DevKitTabBar
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'visitors'   && <VisitorsPanel />}
      {activeTab === 'analytics'  && <AnalyticsPanel />}
      {activeTab === 'onboarding' && <OnboardingFunnelPanel />}
      {activeTab === 'live'       && <LiveActivityPanel />}
    </div>
  );
}
