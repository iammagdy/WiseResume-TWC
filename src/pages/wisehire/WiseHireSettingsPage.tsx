import { useState, useEffect } from 'react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getUserId } from '@/lib/supabaseBridge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  AlertCircle,
  Loader2,
  Building2,
  User,
  Save,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AISettingsSheet } from '@/components/settings/AISettingsSheet';

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  groq: 'Groq',
  mistral: 'Mistral',
  xai: 'xAI',
  cohere: 'Cohere',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
};

function formatProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

// ── AI Key Section ────────────────────────────────────────────────────

function AIKeySection({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: async () => {
      const { data, error } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { action: 'get' },
      });
      if (error || !data?.keys) return [] as string[];
      return (data.keys as Array<{ provider: string }>).map((k) => k.provider);
    },
    staleTime: 30 * 1000,
  });
  const providers = data ?? [];

  function renderStatus() {
    if (loading) {
      return (
        <span className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking connected keys…
        </span>
      );
    }
    if (providers.length === 0) {
      return (
        <span className="text-sm text-slate-400 dark:text-slate-500">No keys configured</span>
      );
    }
    const labels = providers.map(formatProviderLabel).join(', ');
    return (
      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
        {labels} connected
      </span>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <KeyRound className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI API Keys (BYOK)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            Connect your own API keys for OpenAI, Anthropic, Groq, Mistral, and more.
          </p>
          <div className="mt-2">{renderStatus()}</div>
        </div>
      </div>
      <Button
        onClick={onOpen}
        variant="outline"
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        Manage AI Keys
      </Button>
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
  const [showAISettings, setShowAISettings] = useState(false);

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
        <AIKeySection onOpen={() => setShowAISettings(true)} />
        <AccountInfoSection />
      </div>

      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />
    </WiseHireShell>
  );
}
