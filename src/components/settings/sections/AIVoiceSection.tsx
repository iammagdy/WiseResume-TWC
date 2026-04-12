import { memo, Suspense, lazy } from 'react';
import { Brain, ScanFace, Mic, ShieldCheck } from 'lucide-react';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';

const AICreditsRow = lazy(() => import('./AICreditsRow'));

interface AIVoiceSectionProps {
    onOpenAISettings: () => void;
    onOpenElevenLabsKey: () => void;
}

export const AIVoiceSection = memo(function AIVoiceSection({
    onOpenAISettings,
    onOpenElevenLabsKey,
}: AIVoiceSectionProps) {
    const aiProvider = useSettingsStore(s => s.aiProvider);
    const elevenlabsApiKey = useSettingsStore(s => s.elevenlabsApiKey);
    const redactPiiBeforeAI = useSettingsStore(s => s.redactPiiBeforeAI);
    const setRedactPiiBeforeAI = useSettingsStore(s => s.setRedactPiiBeforeAI);

    return (
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <SettingsRow
                type="navigation"
                label="AI Provider"
                description="Powers analysis, tailoring, and enhancements"
                value={aiProvider === 'wiseresume' ? 'Wise AI' : aiProvider === 'ollama' ? 'Ollama' : 'Gemini'}
                icon={<Brain className="w-4 h-4" />}
                onClick={onOpenAISettings}
            />
            <Separator className="ml-[52px] bg-border/30" />
            <Suspense fallback={null}>
                <AICreditsRow onOpenAISettings={onOpenAISettings} />
            </Suspense>
            <Separator className="ml-[52px] bg-border/30" />
            <SettingsRow
                type="toggle"
                label="Redact personal info before AI processing"
                description="Replaces your name, email, phone, and address with placeholders before sending to AI providers."
                checked={redactPiiBeforeAI}
                icon={<ShieldCheck className="w-4 h-4" />}
                onCheckedChange={setRedactPiiBeforeAI}
            />
            <Separator className="ml-[52px] bg-border/30" />
            <SettingsRow
                type="navigation"
                label="AI Professional Headshot"
                description="Generate a professional photo from your selfies"
                value="Coming Soon"
                icon={<ScanFace className="w-4 h-4" />}
                onClick={() => toast('AI Headshots are coming in the next update!', { icon: '📸' })}
            />
            <Separator className="ml-[52px] bg-border/30" />

            {elevenlabsApiKey ? (
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">ElevenLabs Connected</p>
                        <p className="text-xs text-muted-foreground">
                            Used for speech-to-text in mock interviews
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onOpenElevenLabsKey}
                        className="text-xs"
                    >
                        Manage
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-3 px-4 py-4">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Mic className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">
                            ElevenLabs Voice
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Connect your API key for realistic voice interviews
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="default"
                        onClick={onOpenElevenLabsKey}
                        className="shrink-0"
                    >
                        Connect
                    </Button>
                </div>
            )}
        </div>
    );
});
