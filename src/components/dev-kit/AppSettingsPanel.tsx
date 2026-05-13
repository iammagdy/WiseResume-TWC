import { useState, useCallback, useEffect } from 'react';
import { Power, ShieldAlert, Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { devKitCall } from '@/lib/devkit/devKitClient';
import { DevKitErrorCard } from './DevKitErrorCard';

interface AppSetting {
  $id: string;
  key: string;
  value: string;
}

interface AppSettingsResponse {
  settings: AppSetting[];
  total: number;
  missing_collection?: boolean;
}

export const AppSettingsPanel = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await devKitCall<AppSettingsResponse>({ action: 'list-app-settings' });
    if (result.ok) {
      const map: Record<string, string> = {};
      for (const doc of result.data.settings) {
        map[doc.key] = doc.value;
      }
      setSettings(map);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const toggleSetting = async (key: string, current: string | undefined) => {
    const newValue = current === 'true' ? 'false' : 'true';
    setToggling(key);
    const result = await devKitCall<{ setting: AppSetting }>({
      action: 'toggle-app-setting',
      payload: { key, value: newValue },
    });
    if (result.ok) {
      setSettings(prev => ({ ...prev, [key]: newValue }));
      toast.success(`${key} updated successfully`);
    } else {
      toast.error(result.error.message);
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <DevKitErrorCard
        error={error}
        title="Failed to load app settings"
        onRetry={fetchSettings}
        context={{ panel: 'Core Settings', action: 'list-app-settings' }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <ShieldAlert size={24} /> <h3 className="font-bold text-xl uppercase tracking-tighter">Maintenance Mode</h3>
          </div>
          <p className="text-sm text-red-200/50">Instantly lock the app for all users. Use only for critical updates.</p>
        </div>
        <button
          onClick={() => toggleSetting('maintenance_mode', settings.maintenance_mode)}
          disabled={toggling === 'maintenance_mode'}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
            settings.maintenance_mode === 'true'
              ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]'
              : 'bg-white/5 text-red-400 border border-red-500/20'
          }`}
        >
          {toggling === 'maintenance_mode' ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving…</span>
          ) : (
            settings.maintenance_mode === 'true' ? 'DISABLE MAINTENANCE' : 'ACTIVATE MAINTENANCE'
          )}
        </button>
      </div>

      <div className="p-8 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-6">
        <h3 className="font-bold text-xl text-white flex items-center gap-3">
          <Rocket size={24} className="text-blue-400" /> Feature Toggles
        </h3>
        <div className="space-y-3">
          <ToggleItem
            label="AI Tailoring"
            icon={<CheckCircle2 size={16} />}
            active={settings.feature_tailor === 'true'}
            disabled={toggling === 'feature_tailor'}
            onToggle={() => toggleSetting('feature_tailor', settings.feature_tailor)}
          />
          <ToggleItem
            label="AI Chat & Assistant"
            icon={<CheckCircle2 size={16} />}
            active={settings.feature_chat === 'true'}
            disabled={toggling === 'feature_chat'}
            onToggle={() => toggleSetting('feature_chat', settings.feature_chat)}
          />
          <ToggleItem
            label="Public Portfolios"
            icon={<CheckCircle2 size={16} />}
            active={settings.feature_portfolio === 'true'}
            disabled={toggling === 'feature_portfolio'}
            onToggle={() => toggleSetting('feature_portfolio', settings.feature_portfolio)}
          />
        </div>
      </div>
    </div>
  );
};

interface ToggleItemProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

function ToggleItem({ label, active, onToggle, icon, disabled }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3 text-white/80 font-medium">{icon} {label}</div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-12 h-6 rounded-full relative transition-all disabled:opacity-50 ${active ? 'bg-blue-600' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
