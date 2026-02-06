import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations } from '@/hooks/useResumes';
import { 
  parseResumePDF, 
  parseResumePDFWithOCR,
  getExtractionSummary, 
  PDFParseError,
  estimateOCRTime,
  OCRProgressCallback,
} from '@/lib/pdfParser';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { UploadErrorRecovery, UploadErrorType } from '@/components/upload/UploadErrorRecovery';
import { UploadProgressSteps, ParseStep } from '@/components/upload/UploadProgressSteps';
import { toast } from 'sonner';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { createResume } = useResumeMutations();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseStep, setParseStep] = useState<ParseStep>('reading');
  
  // Error recovery state
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);
  const [errorType, setErrorType] = useState<UploadErrorType>('UNKNOWN');
  const [extractedSections, setExtractedSections] = useState<{
    contact?: boolean;
    summary?: boolean;
    experience?: number;
    education?: number;
    skills?: number;
  } | undefined>(undefined);
  
  // OCR fallback state
  const [showOCRPrompt, setShowOCRPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number; status?: string } | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  const handleOCRConfirm = useCallback(async () => {
    if (!pendingFile) return;
    
    setIsOCRProcessing(true);
    
    try {
      const progressCallback: OCRProgressCallback = (progress) => {
        setOcrProgress({ page: progress.page, total: progress.total, status: progress.status });
      };
      
      const resumeData = await parseResumePDFWithOCR(pendingFile, progressCallback);
      const extraction = getExtractionSummary(resumeData);
      
      // If user is authenticated, save to cloud
      if (user) {
        try {
          const newResume = await createResume.mutateAsync({
            resume: resumeData,
            title: resumeData.contactInfo.fullName || 'Uploaded Resume',
          });
          setCurrentResumeId(newResume.id);
          setCurrentResume({
            ...resumeData,
            id: newResume.id,
          });
        } catch (error) {
          console.error('Failed to save to cloud:', error);
          // Still set locally even if cloud save fails
          setCurrentResume(resumeData);
        }
      } else {
        setCurrentResume(resumeData);
      }
      
      toast.warning(
        'Resume extracted via OCR. Please review all sections for accuracy.',
        { duration: 6000 }
      );
      
      if (extraction.isPartial) {
        toast.info(extraction.summary, { duration: 4000 });
      }
      
      navigate('/editor');
    } catch (error) {
      console.error('OCR extraction failed:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'OCR extraction failed. The PDF may be too low quality.',
        { duration: 5000 }
      );
    } finally {
      setIsOCRProcessing(false);
      setShowOCRPrompt(false);
      setPendingFile(null);
      setOcrProgress(null);
    }
  }, [pendingFile, user, createResume, setCurrentResume, setCurrentResumeId, navigate]);

  const handleOCRCancel = useCallback(() => {
    setShowOCRPrompt(false);
    setPendingFile(null);
    setIsProcessing(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      // Step 1: Reading
      await new Promise(resolve => setTimeout(resolve, 300));
      setParseStep('detecting');
      
      const result = await parseResumePDF(file);
      
      // Step 2: Detecting text
      if (result.needsOCR) {
        setPendingFile(file);
        setEstimatedTime(estimateOCRTime(result.pageCount));
        setShowOCRPrompt(true);
        setIsProcessing(false);
        return;
      }
      
      setParseStep('extracting');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const resumeData = result.data!;
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        // Show error recovery UI instead of just a toast
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 300));

      // If user is authenticated, save to cloud
      if (user) {
        try {
          const newResume = await createResume.mutateAsync({
            resume: resumeData,
            title: resumeData.contactInfo.fullName || 'Uploaded Resume',
          });
          setCurrentResumeId(newResume.id);
          setCurrentResume({
            ...resumeData,
            id: newResume.id,
          });
        } catch (error) {
          console.error('Failed to save to cloud:', error);
          setCurrentResume(resumeData);
        }
      } else {
        setCurrentResume(resumeData);
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (extraction.isPartial) {
        // Show partial extraction recovery UI
        setExtractedSections({
          contact: Boolean(resumeData.contactInfo.fullName || resumeData.contactInfo.email),
          summary: resumeData.summary.length > 20,
          experience: resumeData.experience.length,
          education: resumeData.education.length,
          skills: resumeData.skills.length,
        });
        toast.warning(
          `${extraction.summary}. Some sections may need manual entry.`,
          { duration: 5000 }
        );
      } else {
        toast.success(extraction.summary, { duration: 4000 });
      }

      navigate('/editor');
    } catch (error) {
      console.error('Error parsing PDF:', error);
      
      if (error instanceof PDFParseError) {
        switch (error.code) {
          case 'PASSWORD_PROTECTED':
            setErrorType('PASSWORD_PROTECTED');
            setShowErrorRecovery(true);
            break;
          case 'CORRUPTED':
            setErrorType('CORRUPTED');
            setShowErrorRecovery(true);
            break;
          case 'NO_TEXT':
            setErrorType('NO_TEXT');
            setShowErrorRecovery(true);
            break;
          default:
            setErrorType('UNKNOWN');
            setShowErrorRecovery(true);
        }
      } else {
        setErrorType('UNKNOWN');
        setShowErrorRecovery(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate]);

  const handleStartFresh = useCallback(() => {
    setShowErrorRecovery(false);
    navigate('/editor');
  }, [navigate]);

  const handleTryDifferentFile = useCallback(() => {
    setShowErrorRecovery(false);
    setFileName(null);
  }, []);

  const handleTryOCRFromRecovery = useCallback(() => {
    if (pendingFile) {
      setShowErrorRecovery(false);
      setShowOCRPrompt(true);
    }
  }, [pendingFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-3 -ml-3 rounded-full hover:bg-muted active:scale-95 transition-all touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-semibold truncate">Upload Resume</h1>
        </div>
      </header>
      <div className="flex-1 flex flex-col px-4 py-6">
        <AnimatePresence mode="wait">
          {showErrorRecovery ? (
            <motion.div
              key="error-recovery"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UploadErrorRecovery
                errorType={errorType}
                extractedSections={extractedSections}
                onTryOCR={errorType === 'NO_TEXT' ? handleTryOCRFromRecovery : undefined}
                onStartFresh={handleStartFresh}
                onTryDifferentFile={handleTryDifferentFile}
                hasOCROption={errorType === 'NO_TEXT'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="upload-zone"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Upload Zone */}
              <motion.div
                className={`flex-1 min-h-[280px] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 relative ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                } ${isProcessing ? 'pointer-events-none' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                
                {isProcessing ? (
                  <UploadProgressSteps currentStep={parseStep} fileName={fileName ?? undefined} />
                ) : (
                  <>
                    <motion.div
                      className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-5"
                      animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                      style={{
                        boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.4)',
                      }}
                    >
                      {isDragging ? (
                        <FileText className="w-10 h-10 text-primary-foreground" />
                      ) : (
                        <Upload className="w-10 h-10 text-primary-foreground" />
                      )}
                    </motion.div>
                    
                    <h2 className="text-xl font-display font-semibold mb-2 text-center">
                      {isDragging ? 'Drop to Upload' : 'Upload Your PDF'}
                    </h2>
                    
                    <p className="text-muted-foreground text-center text-sm mb-4 max-w-[260px]">
                      Drag and drop or tap to browse
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>PDF only, max 10MB</span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Tips - More Compact */}
              {!isProcessing && (
                <motion.div
                  className="mt-5 p-4 rounded-xl bg-muted/50 border border-border"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="font-medium text-sm mb-2">💡 For best results</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Text-based PDFs work best</li>
                    <li>✓ Keep formatting simple</li>
                    <li>✓ Scanned PDFs? We'll try OCR</li>
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* OCR Prompt Dialog */}
      <OCRPromptDialog
        open={showOCRPrompt}
        onConfirm={handleOCRConfirm}
        onCancel={handleOCRCancel}
        isProcessing={isOCRProcessing}
        progress={ocrProgress ?? undefined}
        estimatedTime={estimatedTime}
      />
    </div>
  );
}
