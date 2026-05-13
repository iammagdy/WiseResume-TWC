import { useState } from 'react';
import type { ElementType } from 'react';
import { Mail, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailManagementPanel } from './EmailManagementPanel';
import { TestmailInboxPanel } from './TestmailInboxPanel';

type EmailSubTab = 'send' | 'inbox';

const TABS: { id: EmailSubTab; label: string; Icon: ElementType }[] = [
  { id: 'send',  label: 'Send',  Icon: Mail },
  { id: 'inbox', label: 'Inbox', Icon: Inbox },
];

export function EmailHubPanel() {
  const [activeTab, setActiveTab] = useState<EmailSubTab>('send');

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
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

      {/* Tab content */}
      {activeTab === 'send'  && <EmailManagementPanel />}
      {activeTab === 'inbox' && <TestmailInboxPanel />}
    </div>
  );
}
