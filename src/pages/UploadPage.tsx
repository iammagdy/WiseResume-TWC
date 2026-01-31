import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useResumeStore } from '@/store/resumeStore';
import { 
  parseResumePDF, 
  parseResumePDFWithOCR,
  getExtractionSummary, 
  PDFParseError,
  estimateOCRTime,
  OCRProgressCallback,
} from '@/lib/pdfParser';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { toast } from 'sonner';

export default function UploadPage() {
  const navigate = useNavigate();
  const { setCurrentResume } = useResumeStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
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
      
      setCurrentResume(resumeData);
      
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
  }, [pendingFile, setCurrentResume, navigate]);

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

    try {
      const result = await parseResumePDF(file);
      
      if (result.needsOCR) {
        setPendingFile(file);
        setEstimatedTime(estimateOCRTime(result.pageCount));
        setShowOCRPrompt(true);
        setIsProcessing(false);
        return;
      }
      
      const resumeData = result.data!;
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        toast.error(
          'Could not extract any content from this PDF.',
          { duration: 5000 }
        );
        setIsProcessing(false);
        return;
      }

      setCurrentResume(resumeData);

      if (extraction.isPartial) {
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
            toast.error('This PDF is password protected. Please upload an unprotected version.');
            break;
          case 'CORRUPTED':
            toast.error('This PDF appears to be corrupted or invalid.');
            break;
          case 'NO_TEXT':
            toast.error(
              'Could not extract readable text. This usually happens with scanned or image-based PDFs.',
              { duration: 5000 }
            );
            break;
          default:
            toast.error('Failed to parse PDF. Please try a different file.');
        }
      } else {
        toast.error('Failed to parse PDF. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [setCurrentResume, navigate]);

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
    <MobileLayout showHeader headerTitle="Upload Resume" onBack={() => navigate('/')}>
      <div className="flex-1 flex flex-col px-4 py-6">
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
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
              <p className="text-lg font-semibold mb-2">Analyzing Resume</p>
              <p className="text-sm text-muted-foreground text-center">
                Extracting your information...
              </p>
              {fileName && (
                <p className="text-sm text-muted-foreground mt-3 truncate max-w-[240px]">
                  {fileName}
                </p>
              )}
            </motion.div>
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
        <motion.div
          className="mt-5 p-4 rounded-xl bg-muted/50 border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-medium text-sm mb-2">Tips for best results</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use a text-based PDF (not scanned)</li>
            <li>• Keep formatting simple</li>
          </ul>
        </motion.div>
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
    </MobileLayout>
  );
}
