import { Badge } from '@/components/ui/badge';
import { Lock, Cloud, Check } from 'lucide-react';
import { useOfflineSyncStore } from '@/store/offlineSyncStore';

export default function CloudSyncBadge({ isSignedIn }: { isSignedIn: boolean }) {
    const pendingCount = useOfflineSyncStore(s => s.pendingChanges.length);

    if (!isSignedIn) {
        return (
            <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5">
                <Lock className="w-3 h-3" />
                Sign in
            </Badge>
        );
    }

    if (pendingCount > 0) {
        return (
            <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 bg-warning/10 text-warning border-warning/30">
                <Cloud className="w-3 h-3" />
                Pending
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <Cloud className="w-3 h-3" />
            <Check className="w-2.5 h-2.5 -ml-1.5" />
            Backed up
        </Badge>
    );
}
