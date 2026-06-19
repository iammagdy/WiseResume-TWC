import { useState } from 'react';
import type { ElementType } from 'react';
import { FlaskConical, Inbox, Mail, Workflow } from 'lucide-react';
import { EmailAutomationsPanel } from './EmailAutomationsPanel';
import { EmailManagementPanel } from './EmailManagementPanel';
import { EmailTransactionalStudioPanel } from './EmailTransactionalStudioPanel';
import { TestmailInboxPanel } from './TestmailInboxPanel';
import { DevKitTabBar } from './DevKitUI';

type EmailSubTab = 'send' | 'automations' | 'inbox' | 'studio';

const TABS: { id: EmailSubTab; label: string; Icon: ElementType }[] = [
  { id: 'send',       label: 'Send',       Icon: Mail },
  { id: 'automations', label: 'Automations', Icon: Workflow },
  { id: 'inbox',      label: 'Inbox',      Icon: Inbox },
  { id: 'studio',     label: 'Studio',     Icon: FlaskConical },
];

export function EmailHubPanel() {
  const [activeTab, setActiveTab] = useState<EmailSubTab>('send');

  return (
    <div className="space-y-6">
      <DevKitTabBar
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'send'        && <EmailManagementPanel />}
      {activeTab === 'automations' && <EmailAutomationsPanel />}
      {activeTab === 'inbox'       && <TestmailInboxPanel />}
      {activeTab === 'studio'      && <EmailTransactionalStudioPanel />}
    </div>
  );
}
