import { memo } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { haptics } from '@/lib/haptics';

interface DangerZoneSectionProps {
  onSignOut: () => void;
  onDeleteData: () => void;
}

export const DangerZoneSection = memo(function DangerZoneSection({
  onSignOut,
  onDeleteData,
}: DangerZoneSectionProps) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 overflow-hidden shadow-soft">
      <SettingsRow
        type="button"
        label="Sign Out"
        description="End your session on this device"
        icon={<LogOut className="w-4 h-4" />}
        onClick={() => { haptics.medium(); onSignOut(); }}
        destructive
      />
      <Separator className="ml-[52px] bg-destructive/20" />
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
