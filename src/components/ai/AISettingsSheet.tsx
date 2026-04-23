import { useState, useCallback } from 'react';
import { Zap, Key, Trash2, Plus, RefreshCw, Check, X, ChevronDown, Shield } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSettingsStore, ByokKeyHint } from '@/store/settingsStore';
import { useAIKeyHydration } from '@/hooks/useAIKeyHydration';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { toast } from 'sonner';

const PROVIDER_DISPLAY: Record<string, { label: string; color: string }> = {
  openai:     { label: 'OpenAI',        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  anthropic:  { label: 'Anthropic',     color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  gemini:     { label: 'Google Gemini', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  groq:       { label: 'Groq',          color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  mistral:    { label: 'Mistral AI',    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  cohere:     { label: 'Cohere',        color: 'bg-teal-500/10 text-teal-600 border-teal-500/30' },
  openrouter: { label: 'OpenRouter',    color: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
  xai:        { label: 'xAI Grok',     color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
};

const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_DISPLAY);

function ProviderBadge({ provider }: { provider: string }) {
  const cfg = PROVIDER_DISPLAY[provider];
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', cfg?.color ?? 'bg-muted text-muted-foreground border-border')}>
      {cfg?.label ?? provider}
    </span>
  );
}

interface AddKeyFormProps {
  existingProviders: string[];
  onSaved: (provider: string) => void;
  onCancel: () => void;
}

function AddKeyForm({ existingProviders, onSaved, onCancel }: AddKeyFormProps) {
  const [provider, setProvider] = useState('');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<{ ok: boolean; model?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const availableProviders = SUPPORTED_PROVIDERS.filter(p => !existingProviders.includes(p));

  const handleTest = useCallback(async () => {
    if (!provider || !key.trim()) return;
    setTesting(true);
    setTested(null);
    try {
      const { data, response } = await edgeFunctions.functions.invoke('validate-api-key', {
        body: { provider, key: key.trim() },
      }) as any;
      if (!response.ok || !data?.ok) {
        setTested({ ok: false, error: data?.error ?? `HTTP ${response.status}` });
      } else {
        setTested({ ok: true, model: data.model });
      }
    } catch (err) {
      setTested({ ok: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }, [provider, key]);

  const handleSave = useCallback(async () => {
    if (!provider || !key.trim() || !tested?.ok) return;
    setSaving(true);
    try {
      const { data, response } = await edgeFunctions.functions.invoke('manage-api-keys', {
        body: { provider, key: key.trim() },
      }) as any;
      if (!response.ok) {
        if (data?.error === 'encryption_not_configured') {
          toast.error('BYOK storage is not yet configured on this server. Contact the administrator.');
        } else {
          toast.error(data?.message ?? 'Failed to save key');
        }
        return;
      }
      toast.success(`${PROVIDER_DISPLAY[provider]?.label ?? provider} key saved`);
      onSaved(provider);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save key');
    } finally {
      setSaving(false);
    }
  }, [provider, key, tested, onSaved]);

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label className="text-xs">Provider</Label>
        <Select value={provider} onValueChange={(v) => { setProvider(v); setTested(null); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select provider…" />
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map(p => (
              <SelectItem key={p} value={p}>{PROVIDER_DISPLAY[p]?.label ?? p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">API Key</Label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setTested(null); }}
            placeholder="sk-…"
            className="h-9 text-sm font-mono flex-1"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-3 shrink-0"
            onClick={handleTest}
            disabled={!provider || !key.trim() || testing}
          >
            {testing
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : 'Test'}
          </Button>
        </div>
      </div>

      {tested && (
        <div className={cn(
          'flex items-start gap-2 text-xs rounded-lg px-3 py-2',
          tested.ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'
        )}>
          {tested.ok
            ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            : <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <span>
            {tested.ok
              ? `Connected — model: ${tested.model}`
              : tested.error}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-9"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9"
          onClick={handleSave}
          disabled={!tested?.ok || saving}
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          Save Key
        </Button>
      </div>
    </div>
  );
}

interface AISettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsSheet({ open, onOpenChange }: AISettingsSheetProps) {
  const {
    byokEnabled,
    byokProvider,
    byokKeyHints,
    setByokEnabled,
    setByokProvider,
    setByokKeyHints,
  } = useSettingsStore();

  const { refetch } = useAIKeyHydration();
  const [addingKey, setAddingKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingByok, setTogglingByok] = useState(false);

  const handleToggleByok = useCallback(async (enabled: boolean) => {
    setTogglingByok(true);
    try {
      // Determine which provider to activate when enabling
      const newProvider = enabled && byokKeyHints.length > 0
        ? (byokKeyHints.find(k => k.is_active)?.provider ?? byokKeyHints[0].provider)
        : byokProvider;

      const { response } = await edgeFunctions.functions.invoke('manage-api-keys', {
        method: 'PATCH',
        body: { byok_enabled: enabled, byok_provider: enabled ? newProvider : null },
      }) as any;

      if (!response.ok) {
        toast.error('Failed to update AI engine setting');
        return;
      }

      setByokEnabled(enabled);
      if (enabled && newProvider) setByokProvider(newProvider);
      else if (!enabled) setByokProvider(null);
    } catch {
      toast.error('Failed to update AI engine setting');
    } finally {
      setTogglingByok(false);
    }
  }, [byokEnabled, byokKeyHints, byokProvider, setByokEnabled, setByokProvider]);

  const handleSelectProvider = useCallback(async (provider: string) => {
    try {
      const { response } = await edgeFunctions.functions.invoke('manage-api-keys', {
        method: 'PATCH',
        body: { byok_provider: provider },
      }) as any;
      if (!response.ok) { toast.error('Failed to update provider'); return; }
      setByokProvider(provider);
    } catch {
      toast.error('Failed to update provider');
    }
  }, [setByokProvider]);

  const handleDelete = useCallback(async (key: ByokKeyHint) => {
    setDeletingId(key.id);
    try {
      const { response } = await edgeFunctions.functions.invoke('manage-api-keys', {
        method: 'DELETE',
        body: { id: key.id },
      }) as any;
      if (!response.ok) { toast.error('Failed to delete key'); return; }

      const updated = byokKeyHints.filter(k => k.id !== key.id);
      setByokKeyHints(updated);

      // If we just deleted the active BYOK provider, disable BYOK
      if (byokEnabled && byokProvider === key.provider && updated.length === 0) {
        await handleToggleByok(false);
      } else if (byokEnabled && byokProvider === key.provider && updated.length > 0) {
        await handleSelectProvider(updated[0].provider);
      }
    } catch {
      toast.error('Failed to delete key');
    } finally {
      setDeletingId(null);
    }
  }, [byokKeyHints, byokEnabled, byokProvider, setByokKeyHints, handleToggleByok, handleSelectProvider]);

  const handleKeySaved = useCallback(async (provider: string) => {
    setAddingKey(false);
    // Refresh key list from server
    await refetch();
    // If this is the first key and BYOK was off, offer to enable
    if (!byokEnabled) {
      await handleToggleByok(true);
    } else {
      // Auto-select the newly added provider
      await handleSelectProvider(provider);
    }
  }, [byokEnabled, refetch, handleToggleByok, handleSelectProvider]);

  const engineLabel = byokEnabled && byokProvider
    ? `Your ${PROVIDER_DISPLAY[byokProvider]?.label ?? byokProvider} key`
    : 'WiseResume AI Pool';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            AI Engine
          </SheetTitle>
          <SheetDescription className="text-left">
            Choose between WiseResume's managed AI pool or your own API key.
          </SheetDescription>
        </SheetHeader>

        {/* Active engine indicator */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 mb-4">
          <span className={cn(
            'w-2 h-2 rounded-full',
            byokEnabled ? 'bg-amber-400' : 'bg-emerald-400'
          )} />
          <span className="text-sm font-medium">{engineLabel}</span>
        </div>

        {/* BYOK toggle */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="space-y-0.5 flex-1 pr-4">
              <p className="text-sm font-medium">Use my own API key</p>
              <p className="text-xs text-muted-foreground">
                {byokEnabled
                  ? 'AI calls use your key. Credits are not consumed.'
                  : 'AI calls use the WiseResume managed pool.'}
              </p>
            </div>
            <Switch
              checked={byokEnabled}
              onCheckedChange={handleToggleByok}
              disabled={togglingByok || (byokKeyHints.length === 0 && !byokEnabled)}
            />
          </div>
          {byokEnabled && byokKeyHints.length === 0 && (
            <div className="px-4 py-2 border-t border-border/50 bg-amber-500/5">
              <p className="text-xs text-amber-600">Add a key below to enable BYOK.</p>
            </div>
          )}
        </div>

        {/* Saved keys list */}
        {byokKeyHints.length > 0 && (
          <div className="mb-4 space-y-0 rounded-2xl bg-card border border-border overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 pt-3 pb-2">
              Saved Keys
            </p>
            {byokKeyHints.map((k, i) => (
              <div key={k.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <ProviderBadge provider={k.provider} />
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                    {k.key_hint ?? '•••'}
                  </span>
                  {byokEnabled && byokProvider === k.provider && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Active</Badge>
                  )}
                  {byokEnabled && byokProvider !== k.provider && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleSelectProvider(k.provider)}
                    >
                      Use
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(k)}
                    disabled={deletingId === k.id}
                  >
                    {deletingId === k.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add key form */}
        {addingKey ? (
          <div className="rounded-2xl bg-card border border-border px-4 py-4 mb-4">
            <p className="text-sm font-medium mb-3">Add API Key</p>
            <AddKeyForm
              existingProviders={byokKeyHints.map(k => k.provider)}
              onSaved={handleKeySaved}
              onCancel={() => setAddingKey(false)}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-10 gap-2 mb-4"
            onClick={() => setAddingKey(true)}
          >
            <Plus className="w-4 h-4" />
            Add API Key
          </Button>
        )}

        {/* Privacy note */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40">
          <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Keys are encrypted server-side and never returned in plaintext. Only the masked hint is stored on this device.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
