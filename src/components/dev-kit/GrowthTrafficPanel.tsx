import { useState } from 'react';
import type { ElementType } from 'react';
import { Filter, Route, TrendingUp, Zap } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { OnboardingFunnelPanel } from './OnboardingFunnelPanel';
import { VisitorsPanel } from './VisitorsPanel';
import { LiveActivityPanel } from './LiveActivityPanel';
import { DevKitTabBar } from './DevKitUI';

type GrowthTab = 'analytics' | 'visitors' | 'onboarding' | 'live';

const TABS: { id: GrowthTab; label: string; Icon: ElementType }[] = [
  { id: 'analytics',  label: 'App Overview',     Icon: TrendingUp },
  { id: 'visitors',   label: 'Visitor Deep Dive', Icon: Route },
  { id: 'onboarding', label: 'Onboarding',        Icon: Filter },
  { id: 'live',       label: 'Live',              Icon: Zap },
];

export function GrowthTrafficPanel() {
  const [activeTab, setActiveTab] = useState<GrowthTab>('analytics');

  return (
    <div className="space-y-6">
      <DevKitTabBar
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'analytics'  && <AnalyticsPanel />}
      {activeTab === 'visitors'   && <VisitorsPanel />}
      {activeTab === 'onboarding' && <OnboardingFunnelPanel />}
      {activeTab === 'live'       && <LiveActivityPanel />}
    </div>
  );
}
