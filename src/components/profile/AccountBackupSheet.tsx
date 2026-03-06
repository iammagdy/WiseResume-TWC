import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Download, Upload, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { exportFullAccount, importFullAccount, type ImportProgress } from '@/lib/accountBackup';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useQueryClient } from '@tanstack/react-query';

interface AccountBackupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail?: string | null;
  fullName?: string | null;
}

export function AccountBackupSheet({ open, onOpenChange, userId, userEmail, fullName }: AccountBackupSheetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importSteps, setImportSteps] = useState<ImportProgress[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportFullAccount(userId, userEmail, fullName, setExportProgress);
      toast.success('Full account backup downloaded!');
      haptics.light();
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    setImportSteps([]);
    try {
      const result = await importFullAccount(file, userId, setImportSteps);
      setImportResult(result);
      if (result.failed === 0) {
        toast.success(`All ${result.success} sections imported!`);
      } else {
        toast.warning(`${result.success} imported, ${result.failed} had errors`);
      }
      haptics.light();
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDone = () => {
    queryClient.invalidateQueries();
    setImportResult(null);
    setImportSteps([]);
    onOpenChange(false);
  };

  const TABLE_LABELS: Record<string, string> = {
    profile: 'Profile',
    resumes: 'Resumes',
    coverLetters: 'Cover Letters',
    jobApplications: 'Job Applications',
    jobs: 'Saved Jobs',
    interviewSessions: 'Interview Sessions',
    careerAssessments: 'Career Assessments',
    resignationLetters: 'Resignation Letters',
    tailorHistory: 'Tailor History',
    preferences: 'Preferences',
    shortLinks: 'Short Links',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>Account Backup</SheetTitle>
          <SheetDescription>Export or import your full account data for auth migration.</SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto space-y-5 pt-4 pb-safe">
          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              API keys and passwords cannot be backed up — you'll need to re-enter them after import.
            </p>
          </div>

          {/* Export */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Export Full Backup</h3>
            <p className="text-xs text-muted-foreground">
              Downloads all your data (profile, resumes, cover letters, applications, settings) as a single JSON file.
            </p>
            {isExporting && <Progress value={exportProgress} className="h-2" />}
            <Button
              className="w-full"
              onClick={handleExport}
              disabled={isExporting || isImporting}
            >
              {isExporting ? <MiniSpinner size={16} className="mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {isExporting ? `Exporting... ${exportProgress}%` : 'Download Full Backup'}
            </Button>
          </div>

          {/* Import */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Import Account Backup</h3>
            <p className="text-xs text-muted-foreground">
              Restore data from a previous WiseResume backup file into your current account.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={isExporting || isImporting}
            >
              {isImporting ? <MiniSpinner size={16} className="mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {isImporting ? 'Importing...' : 'Choose Backup File'}
            </Button>
          </div>

          {/* Import progress */}
          {importSteps.length > 0 && (
            <div className="space-y-1.5">
              {importSteps.map(step => (
                <div key={step.table} className="flex items-center justify-between text-xs px-1">
                  <span className="text-muted-foreground">{TABLE_LABELS[step.table] || step.table}</span>
                  {step.status === 'pending' && <span className="text-muted-foreground/50">—</span>}
                  {step.status === 'importing' && <MiniSpinner size={12} />}
                  {step.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  {step.status === 'error' && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{step.error}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                ✅ {importResult.success} sections restored{importResult.failed > 0 && `, ⚠️ ${importResult.failed} failed`}
              </p>
              <Button className="w-full" onClick={handleDone}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Done — Refresh Data
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
