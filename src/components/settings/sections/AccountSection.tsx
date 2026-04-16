import { memo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Gift } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useResumes } from '@/hooks/useResumes';
import { useCoverLetters } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/utils';

const AccountStatsCard = lazy(() => import('./AccountStatsCard'));

interface AccountSectionProps {
    /** Identifier for the auth provider used to sign the user in (e.g. 'google', 'github'). */
    authProvider: string;
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
    const providerLabel =
        authProvider === 'google' ? 'Google'
        : authProvider === 'github' ? 'GitHub'
        : authProvider === 'apple' ? 'Apple'
        : authProvider === 'email' ? 'email'
        : 'identity provider';
    const navigate = useNavigate();
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
                        <p className="text-xs font-medium text-muted-foreground leading-tight">Your Plan</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <PlanBadge plan={effectivePlan} />
                            {renewalDateStr && (
                                <span className="text-[11px] text-muted-foreground">Expires {renewalDateStr}</span>
                            )}
                        </div>
                    </div>
                </div>
                {isUpgradeable && (
                    <button
                        onClick={() => { haptics.light(); navigate('/subscription'); }}
                        className="text-xs font-semibold text-primary hover:underline touch-manipulation"
                    >
                        Upgrade
                    </button>
                )}
            </div>

            <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
                {/* Subscription */}
                <SettingsRow
                    type="navigation"
                    label="Subscription"
                    description="Manage your plan and usage"
                    icon={<Crown className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/subscription'); }}
                />
                <Separator className="ml-[52px] bg-border/30" />
                {/* Referral */}
                <SettingsRow
                    type="navigation"
                    label="Invite Friends"
                    description="Earn rewards by sharing WiseResume"
                    icon={<Gift className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/referral'); }}
                />
                <Separator className="ml-[52px] bg-border/30" />
                <p className="px-4 py-2.5 text-xs text-muted-foreground">
                    Sign-in & password are managed by your {providerLabel} account.
                </p>
            </div>
        </div>
    );
});
