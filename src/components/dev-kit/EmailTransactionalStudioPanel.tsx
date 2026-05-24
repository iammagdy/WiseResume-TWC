/**
 * EmailTransactionalStudioPanel
 *
 * DevKit sub-panel that lets admins send test renders of every WiseResume
 * transactional email to any address, with any supported sender.
 *
 * Calls the `email-service` Appwrite Function's `send-test` action, which is
 * guarded by DEVKIT_PASSWORD — so this panel requires an active DevKit session.
 */

import { useState } from 'react';
import { CheckCircle, FlaskConical, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { cn } from '@/lib/utils';

// ─── Senders ──────────────────────────────────────────────────────────────────

const SENDERS = [
  { email: 'noreply@thewise.cloud', name: 'WiseResume',  label: 'noreply@thewise.cloud',  description: 'Default — transactional emails' },
  { email: 'hello@thewise.cloud',   name: 'WiseResume',  label: 'hello@thewise.cloud',    description: 'Friendly / marketing' },
  { email: 'contact@thewise.cloud', name: 'WiseResume',  label: 'contact@thewise.cloud',  description: 'Support / admin' },
] as const;

type SenderEmail = (typeof SENDERS)[number]['email'];

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id:          'welcome',
    label:       'Welcome Email',
    description: 'Sent after a user verifies their email address. Uses their first name.',
    hasName:     true,
  },
  {
    id:          'verification',
    label:       'Email Verification',
    description: 'Sent when a new user signs up to confirm their address.',
    hasName:     false,
  },
  {
    id:          'password-reset',
    label:       'Password Reset',
    description: 'Sent when a user requests a password reset link.',
    hasName:     false,
  },
] as const;

type TemplateId = (typeof TEMPLATES)[number]['id'];

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailTransactionalStudioPanel() {
  const [to, setTo]               = useState('');
  const [template, setTemplate]   = useState<TemplateId>('welcome');
  const [name, setName]           = useState('');
  const [sender, setSender]       = useState<SenderEmail>('noreply@thewise.cloud');
  const [sending, setSending]     = useState(false);
  const [lastSent, setLastSent]   = useState<string | null>(null);

  const activeTemplate = TEMPLATES.find(t => t.id === template)!;
  const activeSender   = SENDERS.find(s => s.email === sender)!;

  const handleSend = async () => {
    const trimmedTo = to.trim().toLowerCase();
    if (!trimmedTo || !trimmedTo.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }
    setSending(true);
    setLastSent(null);
    try {
      const body: Record<string, string> = {
        action:     'send-test',
        to:         trimmedTo,
        template,
        from_email: sender,
        from_name:  activeSender.name,
      };
      if (activeTemplate.hasName && name.trim()) {
        body.name = name.trim();
      }

      const tuple = await appwriteFunctions.invoke('email-service', {
        headers: devKitAuthHeaders(),
        body,
      });

      // Appwrite invoke returns [data, error]
      const [data, err] = Array.isArray(tuple) ? tuple : [tuple, null];
      if (err) throw new Error(typeof err === 'string' ? err : JSON.stringify(err));

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed?.error) throw new Error(parsed.error);

      const msgId = parsed?.message_id || parsed?.id;
      setLastSent(trimmedTo);
      toast.success(`Test email sent to ${trimmedTo}`, {
        description: msgId ? `Message ID: ${msgId}` : 'Accepted by Resend. Check your inbox.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to send test email: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3.5 py-3">
        <FlaskConical className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
        <div className="text-xs leading-relaxed text-blue-300">
          <strong className="text-blue-200">Email Template Studio</strong>
          {' '}— send test renders of any transactional email to any address.
          Buttons in test emails use preview-only URLs and won't actually verify or reset anything.
          All three sender addresses must be verified in your{' '}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Resend domain settings
          </a>.
        </div>
      </div>

      {/* Template selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Email Template
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50',
                template === t.id
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  template === t.id ? 'bg-primary' : 'bg-muted-foreground/30',
                )} />
                <span className={cn(
                  'text-xs font-semibold',
                  template === t.id ? 'text-primary' : 'text-foreground',
                )}>
                  {t.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Sender selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sender Address
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SENDERS.map(s => (
            <button
              key={s.email}
              onClick={() => setSender(s.email)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50',
                sender === s.email
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-border bg-card hover:border-emerald-500/30 hover:bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  sender === s.email ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                )} />
                <span className={cn(
                  'text-[11px] font-mono font-semibold',
                  sender === s.email ? 'text-emerald-400' : 'text-foreground',
                )}>
                  {s.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pl-4">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Recipient Email <span className="text-red-400">*</span>
          </label>
          <Input
            type="email"
            placeholder="test@example.com"
            value={to}
            onChange={e => { setTo(e.target.value); setLastSent(null); }}
            className="text-sm"
          />
        </div>

        {activeTemplate.hasName && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name{' '}
              <span className="text-muted-foreground/60">(used in greeting — defaults to "Tester" if blank)</span>
            </label>
            <Input
              placeholder="e.g. Ahmed"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Send button + status */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSend}
          disabled={sending || !to.trim()}
          className="flex items-center gap-2"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="w-4 h-4" />Send Test Email</>
          )}
        </Button>

        {lastSent && !sending && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle className="w-3.5 h-3.5" />
            Sent to {lastSent}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Setup checklist</p>
        <ul className="space-y-1.5 list-none">
          {[
            'email-service Appwrite Function is deployed and active',
            'RESEND_API_KEY is set on the function variables',
            'DEVKIT_PASSWORD matches your DevKit session key',
            'thewise.cloud domain is verified in Resend → Domains',
            'All three sender addresses (noreply / hello / contact) are covered by the domain verification',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
