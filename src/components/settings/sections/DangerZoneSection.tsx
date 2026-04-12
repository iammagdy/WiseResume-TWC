import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { haptics } from '@/lib/haptics';

interface DangerZoneSectionProps {
  onDeleteData: () => void;
}

export const DangerZoneSection = memo(function DangerZoneSection({ onDeleteData }: DangerZoneSectionProps) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 overflow-hidden shadow-soft">
      <SettingsRow
        type="button"
        label="Delete Account"
        description="Permanently delete your account and all data"
        icon={<Trash2 className="w-4 h-4" />}
        onClick={() => { haptics.warning(); onDeleteData(); }}
        destructive
      />
    </div>
  );
});
