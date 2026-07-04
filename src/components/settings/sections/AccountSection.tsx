import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { memo, Suspense, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown, Gift, KeyRound } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ChangePasswordDialog } from '@/components/settings/sections/ChangePasswordDialog';
import { Separator } from '@/components/ui/separator';
import { useResumes } from '@/hooks/useResumes';
import { useCoverLetters } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useJobApplications';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';
import { openExternal } from '@/lib/openExternal';
import { account } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useLocale } from '@/i18n/LocaleProvider';

const AccountStatsCard = lazyWithRetry(() => import('./AccountStatsCard'));

const OAUTH_SECURITY_URLS: Record<string, string> = {
    google: 'https://myaccount.google.com/security',
    github: 'https://github.com/settings/security',
    apple: 'https://appleid.apple.com/account/manage',
};

interface AccountSectionProps {
    /**
     * Optional identifier for the auth provider used to sign the user in
     * (e.g. 'google', 'github', 'apple', 'email'). When omitted or unknown,
     * neutral copy is shown instead.
     */
    authProvider?: string;
}

function PlanBadge({ plan }: { plan: string }) {
    const planKey = plan?.toLowerCase() ?? 'free';
    const colorClass =
        planKey === 'premium'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/30'
            : planKey === 'pro'
            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-400/30'
            : 'bg-muted text-muted-foreground border-border';
    const label = planKey.charAt(0).toUpperCase() + planKey.slice(1);
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', colorClass)}>
            {label}
        </span>
    );
}

export const AccountSection = memo(function AccountSection({
    authProvider,
}: AccountSectionProps) {
    const { locale, t } = useLocale();
    const knownProviderLabel =
        authProvider === 'google' ? 'Google'
        : authProvider === 'github' ? 'GitHub'
        : authProvider === 'apple' ? 'Apple'
        : authProvider === 'email' ? 'email'
        : null;
    const passwordRowDescription =
        knownProviderLabel && knownProviderLabel !== 'email'
            ? t('app.settingsPage.account.providerPassword', 'Update your password through your {{provider}} account', { provider: knownProviderLabel })
            : t('app.settingsPage.account.passwordDescription', 'Change your account password');
    const navigate = useNavigate();
    const [changePwOpen, setChangePwOpen] = useState(false);
    const { user, signOut } = useAuth();
    const { data: resumes = [] } = useResumes();
    const { data: coverLetters = [] } = useCoverLetters();
    const { data: applications = [] } = useJobApplications();
    const { data: meData } = useMe();

    const effectivePlan = meData?.subscription?.effective_plan ?? 'free';
    const isUpgradeable = effectivePlan === 'free' || effectivePlan === 'pro';
    const trialExpiresAt = meData?.subscription?.trial_expires_at ?? null;
    const isActiveTrial = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
    const renewalDateStr = isActiveTrial && trialExpiresAt
        ? new Date(trialExpiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    // Reset-by-email fallback — used when the user can't recall their current password.
    const sendResetEmail = useCallback(async () => {
        const email = user?.email?.trim();
        if (!email) {
            toast.error(t('app.settingsPage.account.resetMissingEmail', 'We could not find your account email. Use Forgot Password on the login screen.'));
            return;
        }
        try {
            // Send branded password-reset OTP email via email-service function.
            const { error: fnError } = await appwriteFunctions.invoke('email-service', {
                body: { action: 'send-password-reset-otp', email, locale },
            });
            if (fnError) throw new Error(fnError.message);
            toast.success(t('app.settingsPage.account.resetSent', 'Verification code sent! Check your inbox.'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('app.settingsPage.account.resetFailed', 'Failed to send verification code'));
        }
    }, [user?.email, locale, t]);

    const handleManageSignInPassword = useCallback(async () => {
        haptics.light();
        try {
            const { identities } = await account.listIdentities();
            const oauthIdentity = identities?.find(
                (identity) =>
                    identity.provider &&
                    !['email', 'password'].includes(identity.provider.toLowerCase()),
            );
            if (oauthIdentity?.provider) {
                const provider = oauthIdentity.provider.toLowerCase();
                const url = OAUTH_SECURITY_URLS[provider];
                if (url) {
                    openExternal(url);
                    return;
                }
                const label = provider.charAt(0).toUpperCase() + provider.slice(1);
                toast.info(t('app.settingsPage.account.providerPasswordSettings', 'Update your password in your {{provider}} account settings.', { provider: label }));
                return;
            }
        } catch {
            // Fall through to the in-app change-password dialog for password accounts.
        }

        // Email/password account → open the in-app change-password form.
        setChangePwOpen(true);
    }, []);

    return (
        <div>
            {/* Account Stats */}
            <Suspense fallback={null}>
                <AccountStatsCard
                    resumes={resumes.length}
                    coverLetters={coverLetters.length}
                    applications={applications.length}
                    createdAt={undefined}
                />
            </Suspense>

            {/* Active Plan summary */}
            <div className="flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl bg-card border border-border shadow-soft">
                <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                        <p className="text-xs font-medium text-muted-foreground leading-tight">
                            {t('app.settingsPage.account.planTitle', 'Your Plan')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <PlanBadge plan={effectivePlan} />
                            {renewalDateStr && (
                                <span className="text-[11px] text-muted-foreground">
                                    {t('app.settingsPage.account.expires', 'Expires {{date}}', { date: renewalDateStr })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {isUpgradeable && (
                    <button
                        onClick={() => { haptics.light(); navigate('/subscription'); }}
                        className="text-xs font-semibold text-primary hover:underline touch-manipulation"
                    >
                        {t('app.settingsPage.account.upgrade', 'Upgrade')}
                    </button>
                )}
            </div>

            <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                {/* Subscription */}
                <SettingsRow
                    type="navigation"
                    label={t('app.settingsPage.account.subscriptionLabel', 'Subscription')}
                    description={t('app.settingsPage.account.subscriptionDescription', 'Manage your plan and usage')}
                    icon={<Crown className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/subscription'); }}
                />
                <Separator className="ml-[52px] bg-border/30" />
                {/* Referral */}
                <SettingsRow
                    type="navigation"
                    label={t('app.settingsPage.account.inviteLabel', 'Invite Friends')}
                    description={t('app.settingsPage.account.inviteDescription', 'Earn rewards by sharing WiseResume')}
                    icon={<Gift className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/referral'); }}
                />
                <Separator className="ml-[52px] bg-border/30" />
                <SettingsRow
                    type="navigation"
                    label={t('app.settingsPage.account.managePasswordLabel', 'Manage Sign-in & Password')}
                    description={passwordRowDescription}
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={handleManageSignInPassword}
                />
            </div>

            <ChangePasswordDialog
                open={changePwOpen}
                onOpenChange={setChangePwOpen}
                onForgotPassword={async () => {
                    setChangePwOpen(false);
                    const email = user?.email || '';
                    await signOut(`/auth?mode=forgot&email=${encodeURIComponent(email)}`);
                }}
            />
        </div>
    );
});
