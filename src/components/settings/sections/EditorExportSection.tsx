import { memo, useState, Suspense, lazy } from 'react';
import { Download, Database, ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const CloudSyncBadge = lazy(() => import('./CloudSyncBadge'));

interface EditorExportSectionProps {
    isSignedIn: boolean;
    onManageExports: () => void;
    onNavigateAuth: () => void;
}

export const EditorExportSection = memo(function EditorExportSection({
    isSignedIn,
    onManageExports,
    onNavigateAuth,
}: EditorExportSectionProps) {
    const [pdfOpen, setPdfOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const { pdfDefaults, setPdfDefaults } = useSettingsStore();

    return (
        <div className="rounded-2xl glass-elevated overflow-hidden">
            {/* PDF Export Settings - Collapsible */}
            <Collapsible open={pdfOpen} onOpenChange={setPdfOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Download className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">PDF Export Settings</p>
                        <p className="text-xs text-muted-foreground">
                            {pdfDefaults.pageNumberFormat === 'simple' ? 'Simple' : 'Full'}, Badge {pdfDefaults.showBranding !== false ? 'on' : 'off'}
                        </p>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        pdfOpen && "rotate-180"
                    )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                            <div className="space-y-0.5">
                                <Label htmlFor="settings-page-numbers" className="text-sm font-medium">Show Page Numbers</Label>
                                <p className="text-xs text-muted-foreground">Display in PDF footer</p>
                            </div>
                            <Switch
                                id="settings-page-numbers"
                                checked={pdfDefaults.showPageNumbers ?? true}
                                onCheckedChange={(checked) => {
                                    haptics.light();
                                    setPdfDefaults({ showPageNumbers: checked });
                                }}
                            />
                        </div>
                        {pdfDefaults.showPageNumbers !== false && (
                            <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                                <Label className="text-sm font-medium">Format</Label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'simple' }); }}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                            pdfDefaults.pageNumberFormat === 'simple'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background hover:border-primary/50'
                                        )}
                                    >
                                        Simple (1)
                                    </button>
                                    <button
                                        onClick={() => { haptics.light(); setPdfDefaults({ pageNumberFormat: 'full' }); }}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border-2 active:scale-[0.98] touch-manipulation',
                                            (pdfDefaults.pageNumberFormat ?? 'full') === 'full'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background hover:border-primary/50'
                                        )}
                                    >
                                        Full (1 of 3)
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                            <div className="space-y-0.5">
                                <Label htmlFor="settings-branding" className="text-sm font-medium flex items-center gap-1.5">
                                    <span className="text-primary">✦</span> WiseResume Badge
                                </Label>
                                <p className="text-xs text-muted-foreground">Prestige stamp on exports</p>
                            </div>
                            <Switch
                                id="settings-branding"
                                checked={pdfDefaults.showBranding ?? true}
                                onCheckedChange={(checked) => {
                                    haptics.light();
                                    setPdfDefaults({ showBranding: checked });
                                }}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Separator className="bg-border/30" />

            {/* Export Resumes - Collapsible */}
            <Collapsible open={exportOpen} onOpenChange={setExportOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium">Export Resumes</p>
                    </div>
                    <Suspense fallback={null}>
                        <CloudSyncBadge isSignedIn={isSignedIn} />
                    </Suspense>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200 ml-1",
                        exportOpen && "rotate-180"
                    )} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-4 pb-4">
                        {isSignedIn ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={onManageExports}
                            >
                                <Database className="w-4 h-4 mr-2" />
                                Manage Exports
                            </Button>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-2">
                                <p className="text-sm text-muted-foreground text-center">Sign in to backup and export your resumes</p>
                                <Button size="sm" onClick={onNavigateAuth}>
                                    Sign in
                                </Button>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
});
