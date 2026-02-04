import { useState } from 'react';
import { Download, FileJson, Database, Loader2, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DatabaseResume } from '@/hooks/useResumes';
import { exportAllResumes, exportSingleResume } from '@/lib/dataExport';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DataExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: DatabaseResume[];
  userEmail: string | null;
  userName: string | null;
  currentResumeId?: string | null;
}

export function DataExportSheet({
  open,
  onOpenChange,
  resumes,
  userEmail,
  userName,
  currentResumeId,
}: DataExportSheetProps) {
  const [isExporting, setIsExporting] = useState<'all' | 'single' | null>(null);
  const [exportedType, setExportedType] = useState<'all' | 'single' | null>(null);

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
      exportSingleResume(currentResume);
      setExportedType('single');
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Data
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Download your resume data as JSON files
          </p>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          {/* Export all resumes */}
          <Button
            variant="outline"
            className={cn(
              'w-full h-auto py-4 px-4 justify-start',
              exportedType === 'all' && 'border-primary bg-primary/5'
            )}
            onClick={handleExportAll}
            disabled={isExporting !== null || resumes.length === 0}
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
            disabled={isExporting !== null || !currentResume}
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

          <p className="text-xs text-muted-foreground text-center pt-2">
            JSON files can be used for backup or data portability
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
