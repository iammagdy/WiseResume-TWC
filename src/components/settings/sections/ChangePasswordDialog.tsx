import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { account } from '@/lib/appwrite';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { useLocale } from '@/i18n/LocaleProvider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Triggered when the user can't recall their current password — runs the reset-by-email flow. */
    onForgotPassword: () => void;
}

/**
 * In-app change-password form for email/password accounts.
 *
 * Uses account.updatePassword(new, current) which requires the current password,
 * so it works without leaving the app or waiting for a reset email. On success it
 * fires a best-effort "your password was changed" notification (authenticated
 * session, so the function derives the recipient from the session JWT).
 */
export function ChangePasswordDialog({ open, onOpenChange, onForgotPassword }: ChangePasswordDialogProps) {
    const { locale } = useLocale();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const resetFields = () => {
        setCurrent('');
        setNext('');
        setConfirm('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (next.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }
        if (next !== confirm) {
            toast.error('New passwords do not match.');
            return;
        }
        if (next === current) {
            toast.error('New password must be different from your current password.');
            return;
        }
        setLoading(true);
        try {
            await account.updatePassword(next, current);
            // Best-effort security notice (authenticated session → function reads the
            // recipient from the session JWT). Never block success on the email.
            try {
                await appwriteFunctions.invoke('email-service', {
                    body: { action: 'send-password-changed', locale },
                });
            } catch {
                /* notification is non-critical */
            }
            toast.success('Password changed successfully.');
            resetFields();
            onOpenChange(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not change password.';
            toast.error(
                /invalid credentials|incorrect|password/i.test(msg)
                    ? 'Your current password is incorrect.'
                    : msg,
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) resetFields();
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change password</DialogTitle>
                    <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-current">Current password</Label>
                        <Input
                            id="cp-current"
                            type="password"
                            autoComplete="current-password"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-new">New password</Label>
                        <Input
                            id="cp-new"
                            type="password"
                            autoComplete="new-password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            required
                            minLength={8}
                        />
                        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="cp-confirm">Confirm new password</Label>
                        <Input
                            id="cp-confirm"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-xs text-primary hover:underline"
                    >
                        Forgot your current password?
                    </button>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <MiniSpinner size={18} className="mr-2" /> : 'Change password'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
