import { memo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, KeyRound, Trash2, HelpCircle, Crown, Gift } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useResumes } from '@/hooks/useResumes';
import { useCoverLetters } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';
import type { KindeAppUser } from '@/contexts/AuthContext';

const AccountStatsCard = lazy(() => import('./AccountStatsCard'));

interface AccountSectionProps {
    user: User;
    authProvider: string;
    onChangePassword: () => void;
    onSignOut: () => void;
    onDeleteData: () => void;
}

export const AccountSection = memo(function AccountSection({
    user,
    authProvider,
    onChangePassword,
    onSignOut,
    onDeleteData,
}: AccountSectionProps) {
    const navigate = useNavigate();
    const { data: resumes = [] } = useResumes();
    const { data: coverLetters = [] } = useCoverLetters();
    const { data: applications = [] } = useJobApplications();

    return (
        <div>
            {/* Account Stats */}
            <Suspense fallback={null}>
                <AccountStatsCard
                    resumes={resumes.length}
                    coverLetters={coverLetters.length}
                    applications={applications.length}
                    createdAt={user.created_at}
                />
            </Suspense>

            <div className="rounded-2xl glass-elevated overflow-hidden">
                {/* Help */}
                <SettingsRow
                    type="navigation"
                    label="Help & FAQ"
                    description="Get answers and contact support"
                    icon={<HelpCircle className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/help'); }}
                />
                <Separator className="bg-border/30" />
                {/* Subscription */}
                <SettingsRow
                    type="navigation"
                    label="Subscription"
                    description="Manage your plan and usage"
                    icon={<Crown className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/subscription'); }}
                />
                <Separator className="bg-border/30" />
                {/* Referral */}
                <SettingsRow
                    type="navigation"
                    label="Invite Friends"
                    description="Earn rewards by sharing WiseResume"
                    icon={<Gift className="w-4 h-4" />}
                    onClick={() => { haptics.light(); navigate('/referral'); }}
                />
                <Separator className="bg-border/30" />
                {/* Change Password - email users only */}
                {authProvider === 'email' && (
                    <>
                        <SettingsRow
                            type="navigation"
                            label="Change Password"
                            description="Send a password reset email"
                            icon={<KeyRound className="w-4 h-4" />}
                            onClick={onChangePassword}
                        />
                        <Separator className="bg-border/30" />
                    </>
                )}
                <SettingsRow
                    type="button"
                    label="Sign Out"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => { haptics.medium(); onSignOut(); }}
                />
                <Separator className="bg-border/30" />
                <SettingsRow
                    type="button"
                    label="Delete All Data"
                    description="Permanently remove all your data"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={onDeleteData}
                    destructive
                />
            </div>
        </div>
    );
});
