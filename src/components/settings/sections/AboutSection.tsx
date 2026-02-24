import { memo } from 'react';
import { RotateCcw, Sparkles, Star, Share2, BookOpen, Bug, Activity } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/lib/haptics';
import { triggerBugReport } from '@/lib/bugReport';

interface AboutSectionProps {
    isSignedIn: boolean;
    onTakeTour: () => void;
    onReplaySplash: () => void;
    onRateApp: () => void;
    onShareApp: () => void;
    onOpenHelp: () => void;
}

export const AboutSection = memo(function AboutSection({
    isSignedIn,
    onTakeTour,
    onReplaySplash,
    onRateApp,
    onShareApp,
    onOpenHelp,
}: AboutSectionProps) {
    return (
        <>
            <div className="rounded-2xl glass-elevated overflow-hidden">
                <SettingsRow
                    type="button"
                    label="Take Tour Again"
                    description="Replay the quick product tour to learn the main features"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={onTakeTour}
                />
                <Separator className="bg-border/30" />
                <SettingsRow
                    type="button"
                    label="Replay Splash Screen"
                    description="Re-watch the animated intro"
                    icon={<Sparkles className="w-4 h-4" />}
                    onClick={onReplaySplash}
                />
                <Separator className="bg-border/30" />
                <SettingsRow
                    type="button"
                    label="Rate WiseResume"
                    description="Love WiseResume? Leave a rating to help others find it"
                    icon={<Star className="w-4 h-4" />}
                    onClick={onRateApp}
                />
                <Separator className="bg-border/30" />
                <SettingsRow
                    type="button"
                    label="Share WiseResume"
                    description="Send a link to a friend or colleague"
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={onShareApp}
                />
            </div>

            <div className="rounded-2xl glass-elevated overflow-hidden mt-3">
                <SettingsRow
                    type="navigation"
                    label="Get Help"
                    description="Docs, email support, and community"
                    icon={<BookOpen className="w-4 h-4" />}
                    onClick={onOpenHelp}
                />
                {isSignedIn && (
                    <>
                        <Separator className="bg-border/30" />
                        <SettingsRow
                            type="button"
                            label="Report a Bug"
                            description="Let us know if something isn't working right"
                            icon={<Bug className="w-4 h-4" />}
                            onClick={() => {
                                haptics.light();
                                triggerBugReport({
                                    errorMessage: 'User-reported issue',
                                    route: window.location.pathname,
                                });
                            }}
                        />
                        <Separator className="bg-border/30" />
                        <SettingsRow
                            type="toggle"
                            label="Shake to Report Bug"
                            description="Shake your device to quickly open the bug report"
                            icon={<Activity className="w-4 h-4" />}
                            checked={useSettingsStore.getState().shakeToReportEnabled}
                            onCheckedChange={(val) => {
                                haptics.light();
                                useSettingsStore.getState().setShakeToReportEnabled(val);
                            }}
                        />
                    </>
                )}
            </div>
        </>
    );
});
