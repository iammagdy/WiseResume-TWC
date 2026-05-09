import { useState, useCallback, useEffect } from 'react';
import {
  Inbox,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronRight,
  Clock,
  Tag,
  Mail,
  Loader2,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { useIsMounted } from '@/lib/devkit/hooks';
import { DevKitErrorCard } from './DevKitErrorCard';

const TAG_FILTERS = ['all', 'welcome', 'signup', 'reset-password', 'otp', 'magic-link'] as const;
type TagFilter = (typeof TAG_FILTERS)[number];

interface TestmailEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: string | null;
  tag: string | null;
  html: string | null;
  text: string | null;
}

interface InboxResponse {
  emails: TestmailEmail[];
  total: number;
  namespace: string;
  testMode: boolean;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TAG_COLORS: Record<string, string> = {
  welcome:        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  signup:         'bg-green-500/10 text-green-400 border-green-500/20',
  'reset-password': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  otp:            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'magic-link':   'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

function TagChip({ tag }: { tag: string | null }) {
  if (!tag) return null;
  const cls = TAG_COLORS[tag] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cls}`}>
      <Tag className="w-2.5 h-2.5" />
      {tag}
    </span>
  );
}

function EmailRow({ email }: { email: TestmailEmail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 hover:bg-muted/20 transition-colors flex items-start gap-3"
      >
        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate max-w-[280px]">
              {email.subject}
            </span>
            <TagChip tag={email.tag} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              To: <span className="font-mono">{email.to}</span>
            </span>
            {email.receivedAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(email.receivedAt)}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 ml-6 space-y-3">
          <div className="text-xs text-muted-foreground space-y-1 font-mono bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
            <p><span className="text-foreground font-sans font-medium">From:</span> {email.from}</p>
            <p><span className="text-foreground font-sans font-medium">To:</span> {email.to}</p>
            {email.receivedAt && (
              <p><span className="text-foreground font-sans font-medium">Received:</span> {new Date(email.receivedAt).toLocaleString()}</p>
            )}
          </div>

          {email.html ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">HTML Preview</span>
              </div>
              <div
                className="p-4 text-sm max-h-80 overflow-auto bg-white dark:bg-zinc-900 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: email.html }}
              />
            </div>
          ) : email.text ? (
            <pre className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground whitespace-pre-wrap max-h-60 overflow-auto">
              {email.text}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground italic">No email body content available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function TestmailInboxPanel() {
  const [tag, setTag]           = useState<TagFilter>('all');
  const [emails, setEmails]     = useState<TestmailEmail[]>([]);
  const [total, setTotal]       = useState(0);
  const [namespace, setNamespace] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sending, setSending]   = useState(false);

  const isMounted = useIsMounted();

  const fetchInbox = useCallback(async (activeTag: TagFilter) => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.invoke('admin-testmail', {
        headers: devKitAuthHeaders(),
        body: { module: 'testmail-inbox', tag: activeTag === 'all' ? null : activeTag },
      });
      const result = unwrapAdminResponse<InboxResponse>(tuple, 'admin-testmail');
      if (!isMounted()) return;
      setEmails(result.emails ?? []);
      setTotal(result.total ?? 0);
      setNamespace(result.namespace ?? '');
      setTestMode(result.testMode ?? false);
      setLoaded(true);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load Testmail inbox'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => { fetchInbox(tag); }, [fetchInbox, tag]);

  const handleSendTest = async () => {
    setSending(true);
    try {
      const tuple = await edgeFunctions.invoke('admin-testmail', {
        headers: devKitAuthHeaders(),
        body: { module: 'testmail-send-test' },
      });
      const result = unwrapAdminResponse<{ sentTo: string; testMode: boolean; tag: string }>(tuple, 'admin-testmail');
      if (!isMounted()) return;
      toast.success('Test email sent', {
        description: result.testMode
          ? `Routed to Testmail inbox → ${result.sentTo}`
          : `Sent to real address → ${result.sentTo}`,
      });
      setTimeout(() => { if (isMounted()) fetchInbox(tag); }, 2000);
    } catch (e) {
      if (!isMounted()) return;
      toast.error(formatEdgeError(e, 'Failed to send test email'));
    } finally {
      if (isMounted()) setSending(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Testmail Inbox</span>
            {loaded && namespace && (
              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {namespace}.*@inbox.testmail.app
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dev email catch-all. Emails routed here when{' '}
            <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">EMAIL_TEST_MODE=true</code>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchInbox(tag)}
            disabled={loading}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendTest}
            disabled={sending}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            {sending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
              : <><Send className="w-3.5 h-3.5" />Send test</>}
          </Button>
        </div>
      </div>

      {/* Test mode badge */}
      {loaded && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
          testMode
            ? 'border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400'
            : 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400'
        }`}>
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          {testMode
            ? 'EMAIL_TEST_MODE is ON — outgoing emails are redirected to this Testmail inbox.'
            : 'EMAIL_TEST_MODE is OFF — emails go to real recipients. Enable it in Appwrite Function Variables to catch them here.'}
        </div>
      )}

      {/* Tag filter */}
      <div className="flex flex-wrap gap-1.5">
        {TAG_FILTERS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              tag === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <DevKitErrorCard
          error={error}
          title="Couldn't load Testmail inbox"
          context={{ panel: 'Testmail Inbox', function: 'admin-testmail' }}
          onRetry={() => fetchInbox(tag)}
        />
      )}

      {loading && !loaded && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {loaded && (
        <div className="rounded-xl border border-border overflow-hidden">
          {emails.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No emails in inbox{tag !== 'all' ? ` for tag "${tag}"` : ''}.</p>
              <p className="text-xs mt-1 opacity-70">
                {testMode
                  ? 'Send a test email above, or trigger a flow in the app.'
                  : 'Enable EMAIL_TEST_MODE in Appwrite Function Variables to redirect emails here.'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {total} email{total !== 1 ? 's' : ''}{tag !== 'all' ? ` · ${tag}` : ''}
                </span>
              </div>
              <div>
                {emails.map(email => (
                  <EmailRow key={email.id} email={email} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
