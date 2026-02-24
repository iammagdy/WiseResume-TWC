import { memo, Suspense, lazy } from 'react';
import { LogOut, KeyRound, Trash2 } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useResumes } from '@/hooks/useResumes';
import { useCoverLetters } from '@/hooks/useCoverLetters';
import { useJobApplications } from '@/hooks/useJobApplications';
import { haptics } from '@/lib/haptics';
import type { User } from '@supabase/supabase-js';

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
