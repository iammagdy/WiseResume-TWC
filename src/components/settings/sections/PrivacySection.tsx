import { memo } from 'react';
import { Clock, EyeOff, Activity } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { Fingerprint, ScanFace, Eye } from 'lucide-react';

interface PrivacySectionProps {
    onOpenBiometricTimeout: () => void;
    onBiometricToggle: (enabled: boolean) => void;
}

export const PrivacySection = memo(function PrivacySection({
    onOpenBiometricTimeout,
    onBiometricToggle,
}: PrivacySectionProps) {
    const {
        localOnlyMode,
        setLocalOnlyMode,
        analyticsEnabled,
        setAnalyticsEnabled,
        biometricLockEnabled,
        biometricLockTimeout,
    } = useSettingsStore();

    const { isAvailable: biometricAvailable, biometryType } = useBiometricLock(biometricLockEnabled);

    const privacyStatus = localOnlyMode && !analyticsEnabled ? 'Strict' : 'Standard';

    const getBiometryIcon = () => {
        if (biometryType === 'faceId') return ScanFace;
        if (biometryType === 'iris') return Eye;
        return Fingerprint;
    };

    const getBiometryLabel = () => {
        if (biometryType === 'faceId') return 'Face ID';
        if (biometryType === 'iris') return 'Iris Lock';
        return 'Fingerprint Lock';
    };

    const BiometryIcon = getBiometryIcon();

    return (
        <>
            <Badge
                variant={privacyStatus === 'Strict' ? 'default' : 'secondary'}
                className="text-[10px] px-2 py-0 ml-auto mb-3"
            >
                {privacyStatus}
            </Badge>

            <div className="rounded-2xl glass-elevated overflow-hidden">
                {/* Biometric lock - available on mobile */}
                {biometricAvailable ? (
                    <>
                        <SettingsRow
                            type="toggle"
                            label={getBiometryLabel()}
                            description="Protect your resumes"
                            icon={<BiometryIcon className="w-4 h-4" />}
                            checked={biometricLockEnabled}
                            onCheckedChange={onBiometricToggle}
                        />
                        {biometricLockEnabled && (
                            <>
                                <Separator className="bg-border/30" />
                                <SettingsRow
                                    type="navigation"
                                    label="Require Authentication After"
                                    value={
                                        biometricLockTimeout === 0 ? 'Immediately' :
                                            biometricLockTimeout === 30000 ? '30 seconds' :
                                                biometricLockTimeout === 60000 ? '1 minute' : '5 minutes'
                                    }
                                    icon={<Clock className="w-4 h-4" />}
                                    onClick={onOpenBiometricTimeout}
                                />
                            </>
                        )}
                        <Separator className="bg-border/30" />
                    </>
                ) : null}

                {/* Privacy toggles */}
                <SettingsRow
                    type="toggle"
                    label="Local-Only Mode"
                    description="Keep data on this device only"
                    icon={<EyeOff className="w-4 h-4" />}
                    checked={localOnlyMode}
                    onCheckedChange={setLocalOnlyMode}
                />
                <Separator className="bg-border/30" />
                <SettingsRow
                    type="toggle"
                    label="Usage Analytics"
                    description="Help improve WiseResume with anonymous usage data"
                    icon={<Activity className="w-4 h-4" />}
                    checked={analyticsEnabled}
                    onCheckedChange={setAnalyticsEnabled}
                />
            </div>

            <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
                Your resumes are stored securely and never sold to third parties.
            </p>
        </>
    );
});
