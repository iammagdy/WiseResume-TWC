import { useState, useRef } from 'react';
import { Download, FileJson, Database, Loader2, Check, Upload, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DatabaseResume } from '@/hooks/useResumes';
import { exportAllResumes, exportSingleResume, importResumes } from '@/lib/dataExport';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/auditLogger';

interface DataExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  userEmail: string | null;
  userName: string | null;
  currentResumeId?: string | null;
  onImportComplete?: () => void;
}

export function DataExportSheet({
  open,
  onOpenChange,
  resumes,
  userEmail,
  userName,
  currentResumeId,
  onImportComplete,
}: DataExportSheetProps) {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<'all' | 'single' | null>(null);
  const [exportedType, setExportedType] = useState<'all' | 'single' | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentResume = currentResumeId 
    ? resumes.find((r) => r.id === currentResumeId) 
    : null;

  const handleExportAll = async () => {
    setIsExporting('all');
    setExportedType(null);
    haptics.medium();

    try {
      await exportAllResumes(resumes, userEmail, userName);
      setExportedType('all');
      logAudit('account', 'data_exported', { type: 'all', resumeCount: resumes.length });
      toast.success(`Exported ${resumes.length} resume${resumes.length !== 1 ? 's' : ''}`);
      haptics.success();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export resumes');
      haptics.error();
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportSingle = async () => {
    if (!currentResume) return;
    
    setIsExporting('single');
    setExportedType(null);
    haptics.medium();

    try {
      await exportSingleResume(currentResume);
      setExportedType('single');
      logAudit('account', 'data_exported', { type: 'single', resumeId: currentResume.id });
      toast.success('Resume exported');
      haptics.success();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export resume');
      haptics.error();
    } finally {
      setIsExporting(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportProgress(20);
    haptics.medium();

    try {
      setImportProgress(50);
      const count = await importResumes(file, user.id);
      setImportProgress(100);
      toast.success(`Imported ${count} resume${count !== 1 ? 's' : ''} successfully`);
      logAudit('account', 'data_imported', { resumeCount: count });
      haptics.success();
      onImportComplete?.();
    } catch (error: unknown) {
      console.error('Import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import backup';
      toast.error(errorMessage);
      haptics.error();
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export & Import Data
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Download your resume data or restore from a backup
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-6">
          {/* Export all resumes */}
          <Button
            variant="outline"
            className={cn(
              'w-full h-auto py-4 px-4 justify-start',
              exportedType === 'all' && 'border-primary bg-primary/5'
            )}
            onClick={handleExportAll}
            disabled={isExporting !== null || isImporting || resumes.length === 0}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                exportedType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {isExporting === 'all' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : exportedType === 'all' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Database className="w-5 h-5" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Export All Resumes</p>
                <p className="text-xs text-muted-foreground">
                  {resumes.length} resume{resumes.length !== 1 ? 's' : ''} + settings backup
                </p>
              </div>
            </div>
          </Button>

          {/* Export current resume */}
          <Button
            variant="outline"
            className={cn(
              'w-full h-auto py-4 px-4 justify-start',
              exportedType === 'single' && 'border-primary bg-primary/5'
            )}
            onClick={handleExportSingle}
            disabled={isExporting !== null || isImporting || !currentResume}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                exportedType === 'single' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {isExporting === 'single' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : exportedType === 'single' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <FileJson className="w-5 h-5" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Export Current Resume</p>
                <p className="text-xs text-muted-foreground">
                  {currentResume 
                    ? `${currentResume.title}` 
                    : 'Open a resume in editor first'}
                </p>
              </div>
            </div>
          </Button>

          {/* Import backup */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            className="w-full h-auto py-4 px-4 justify-start"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting !== null || isImporting || !user}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
                {isImporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold">Import Backup</p>
                <p className="text-xs text-muted-foreground">
                  {user ? 'Restore resumes from a JSON backup file' : 'Sign in to import backups'}
                </p>
              </div>
            </div>
          </Button>

          {/* Import progress */}
          {isImporting && (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importing resumes...</span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            JSON files can be used for backup or data portability
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
