import { useState, useEffect } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getUserId } from '@/lib/supabaseBridge';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Building2,
  User,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

type AIProvider = 'openai' | 'anthropic';
const PROVIDERS: { value: AIProvider; label: string; hint: string; docsUrl: string }[] = [
  { value: 'openai', label: 'OpenAI', hint: 'sk-...', docsUrl: 'https://platform.openai.com/api-keys' },
  { value: 'anthropic', label: 'Claude (Anthropic)', hint: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys' },
];

// ── AI Key Section ────────────────────────────────────────────────────

interface KeyStatus {
  provider: string;
  masked: string;
}

function AIKeySection() {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [savedKeys, setSavedKeys] = useState<KeyStatus[]>([]);
  const [error, setError] = useState('');

  async function fetchKeyStatus() {
    setLoadingStatus(true);
    try {
      const { data } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'list' },
      });
      setSavedKeys((data?.keys ?? []) as KeyStatus[]);
    } catch {
      // Edge function may not be deployed yet — silently skip
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => { fetchKeyStatus(); }, []);

  async function handleSave() {
    if (!key.trim()) { setError('Please enter an API key.'); return; }
    setError('');
    setSaving(true);
    try {
      const { data, error: fnErr } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'set', provider, key: key.trim() },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message ?? data?.error ?? 'Failed to save key');
      setKey('');
      toast.success(`${PROVIDERS.find(p => p.value === provider)?.label} key saved.`);
      fetchKeyStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(providerToDelete: string) {
    setDeleting(true);
    try {
      const { data, error: fnErr } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'delete', provider: providerToDelete },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message ?? data?.error ?? 'Failed to remove key');
      toast.success('API key removed.');
      fetchKeyStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove key');
    } finally {
      setDeleting(false);
    }
  }

  const selectedProviderConfig = PROVIDERS.find(p => p.value === provider)!;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <KeyRound className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI API Key (BYOK)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            Add your own OpenAI or Anthropic key to power AI features on the Starter plan.
          </p>
        </div>
      </div>

      {/* Saved keys */}
      {!loadingStatus && savedKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Saved keys
          </p>
          {savedKeys.map((sk) => (
            <div
              key={sk.provider}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {PROVIDERS.find(p => p.value === sk.provider)?.label ?? sk.provider}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{sk.masked}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(sk.provider)}
                disabled={deleting}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add key form */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="aiProvider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
              <SelectTrigger id="aiProvider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="aiKey">API Key</Label>
            <div className="relative">
              <Input
                id="aiKey"
                type={showKey ? 'text' : 'password'}
                placeholder={selectedProviderConfig.hint}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !key.trim()}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save key
          </Button>
          <a
            href={selectedProviderConfig.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Get key
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Company Profile Section ───────────────────────────────────────

function CompanyProfileSection() {
  const { data: account } = useWiseHireAccount();
  const { user } = useAuth();
  const userId = getUserId();
  const queryClient = useQueryClient();

  const [name, setName] = useState(account?.company?.name ?? '');
  const [size, setSize] = useState(account?.company?.size ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (account?.company) {
      setName(account.company.name ?? '');
      setSize(account.company.size ?? '');
    }
  }, [account]);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaveError('');
    try {
      const { error } = await supabase
        .from('wisehire_companies')
        .upsert(
          { owner_id: userId, name: name.trim(), size },
          { onConflict: 'owner_id' },
        );
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['wisehire-account', userId] });
      toast.success('Company profile saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <Building2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Company Profile</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            Update your company name and size.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companySize">Team size</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger id="companySize">
              <SelectValue placeholder="Select team size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {saveError && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {saveError}
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="bg-blue-700 hover:bg-blue-800 text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
        Save profile
      </Button>
    </section>
  );
}

// ── Account Info Section ─────────────────────────────────────────

function AccountInfoSection() {
  const { user } = useAuth();

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <User className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your Kinde account info.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Name</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {user?.name ?? '—'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Email</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {user?.email ?? '—'}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        To change your name or email, visit your Kinde account settings.
      </p>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function WiseHireSettingsPage() {
  return (
    <WiseHireShell>
      <div className="p-5 lg:p-8 space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your company profile, AI keys, and account.
          </p>
        </div>

        <CompanyProfileSection />
        <AIKeySection />
        <AccountInfoSection />
      </div>
    </WiseHireShell>
  );
}
