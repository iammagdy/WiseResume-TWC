import { memo } from 'react';
import { Clock, Activity } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { Fingerprint, ScanFace, Eye } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

interface PrivacySectionProps {
    onOpenBiometricTimeout: () => void;
    onBiometricToggle: (enabled: boolean) => void;
}

export const PrivacySection = memo(function PrivacySection({
    onOpenBiometricTimeout,
    onBiometricToggle,
}: PrivacySectionProps) {
    const { t } = useLocale();
    const {
        analyticsEnabled,
        setAnalyticsEnabled,
        biometricLockEnabled,
        biometricLockTimeout,
    } = useSettingsStore();

    const { isAvailable: biometricAvailable, biometryType } = useBiometricLock(biometricLockEnabled);

    const privacyStatus = !analyticsEnabled
        ? t('app.settingsPage.privacy.statusStrict', 'Strict')
        : t('app.settingsPage.privacy.statusStandard', 'Standard');

    const getBiometryIcon = () => {
        if (biometryType === 'faceId') return ScanFace;
        if (biometryType === 'iris') return Eye;
        return Fingerprint;
    };

    const getBiometryLabel = () => {
        if (biometryType === 'faceId') return t('app.settingsPage.privacy.faceId', 'Face ID');
        if (biometryType === 'iris') return t('app.settingsPage.privacy.irisLock', 'Iris Lock');
        return t('app.settingsPage.privacy.fingerprintLock', 'Fingerprint Lock');
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

            <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                {/* Biometric lock - available on mobile */}
                {biometricAvailable ? (
                    <>
                        <SettingsRow
                            type="toggle"
                            label={getBiometryLabel()}
                            description={t('app.settingsPage.privacy.protectResumes', 'Protect your resumes')}
                            icon={<BiometryIcon className="w-4 h-4" />}
                            checked={biometricLockEnabled}
                            onCheckedChange={onBiometricToggle}
                        />
                        {biometricLockEnabled && (
                            <>
                                <Separator className="ml-[52px] bg-border/30" />
                                <SettingsRow
                                    type="navigation"
                                    label={t('app.settingsPage.privacy.requireAfter', 'Require Authentication After')}
                                    value={
                                        biometricLockTimeout === 0 ? t('app.settingsPage.privacy.immediately', 'Immediately') :
                                            biometricLockTimeout === 30000 ? t('app.settingsPage.privacy.thirtySeconds', '30 seconds') :
                                                biometricLockTimeout === 60000 ? t('app.settingsPage.privacy.oneMinute', '1 minute') : t('app.settingsPage.privacy.fiveMinutes', '5 minutes')
                                    }
                                    icon={<Clock className="w-4 h-4" />}
                                    onClick={onOpenBiometricTimeout}
                                />
                            </>
                        )}
                        <Separator className="ml-[52px] bg-border/30" />
                    </>
                ) : null}

                {/* Analytics toggle */}
                <SettingsRow
                    type="toggle"
                    label={t('app.settingsPage.privacy.analyticsLabel', 'Usage Analytics')}
                    description={t('app.settingsPage.privacy.analyticsDescription', 'Help improve WiseResume with anonymous usage data')}
                    icon={<Activity className="w-4 h-4" />}
                    checked={analyticsEnabled}
                    onCheckedChange={setAnalyticsEnabled}
                />
            </div>

            <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
                {t('app.settingsPage.privacy.footer', 'Your resumes are stored securely and never sold to third parties.')}
            </p>
        </>
    );
});
