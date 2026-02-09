import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import mammoth from 'mammoth';
import { useResumeStore } from '@/store/resumeStore';
import { useAuth } from '@/hooks/useAuth';
import { useResumeMutations } from '@/hooks/useResumes';
import { 
  parseResumePDF, 
  parseResumePDFWithOCR,
  parseTextWithAI,
  regenerateResumeIds,
  getExtractionSummary, 
  PDFParseError,
  estimateOCRTime,
  OCRProgressCallback,
} from '@/lib/pdfParser';
import { extractTextFromImage } from '@/lib/pdf/ocrExtractor';
import { validateAndCleanResumeData, extractTextFromHTML } from '@/lib/jsonResumeValidator';
import { OCRPromptDialog } from '@/components/upload/OCRPromptDialog';
import { UploadErrorRecovery, UploadErrorType } from '@/components/upload/UploadErrorRecovery';
import { UploadProgressSteps, ParseStep } from '@/components/upload/UploadProgressSteps';
import { ImportReviewSheet, SelectedSections } from '@/components/upload/ImportReviewSheet';
import { ImportUploadSheet, FileType } from '@/components/upload/ImportUploadSheet';
import { UploadZone } from '@/components/upload/UploadZone';
import { toast } from 'sonner';
import type { ResumeData } from '@/types/resume';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  const { createResume } = useResumeMutations();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseStep, setParseStep] = useState<ParseStep>('reading');
  
  // File type selector state
  const [showImportSheet, setShowImportSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Import review state
  const [showImportReview, setShowImportReview] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);

  // Get accept string based on file type
  function getAcceptString(type: FileType): string {
    switch (type) {
      case 'pdf': return '.pdf,application/pdf';
      case 'word': return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'image': return '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
      case 'json': return '.json,application/json';
      case 'html': return '.html,.htm,text/html';
    }
  }

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

  // Handle import confirmation from review sheet
  const handleImportConfirm = useCallback(async (data: ResumeData, sections: SelectedSections) => {
    // Filter data based on selected sections
    const filteredData: ResumeData = {
      ...data,
      contactInfo: sections.contactInfo ? data.contactInfo : {
        fullName: '',
        email: '',
        phone: '',
        location: '',
      },
      summary: sections.summary ? data.summary : '',
      experience: sections.experience ? data.experience : [],
      education: sections.education ? data.education : [],
      skills: sections.skills ? data.skills : [],
      certifications: sections.certifications ? data.certifications : [],
    };

    // Save and navigate
    if (user) {
      try {
        const newResume = await createResume.mutateAsync({
          resume: filteredData,
          title: filteredData.contactInfo.fullName || 'Uploaded Resume',
        });
        setCurrentResumeId(newResume.id);
        setCurrentResume({
          ...filteredData,
          id: newResume.id,
        });
      } catch (error) {
        console.error('Failed to save to cloud:', error);
        setCurrentResume(filteredData);
      }
    } else {
      setCurrentResume(filteredData);
    }

    setShowImportReview(false);
    setPendingResumeData(null);
    
    const selectedCount = Object.values(sections).filter(Boolean).length;
    toast.success(`Imported ${selectedCount} sections successfully!`, { duration: 3000 });
    navigate('/editor');
  }, [user, createResume, setCurrentResume, setCurrentResumeId, navigate]);

  const handleImportReviewClose = useCallback(() => {
    setShowImportReview(false);
    setPendingResumeData(null);
  }, []);

  // Detect file type from MIME type or extension
  function detectFileType(file: File): FileType {
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime === 'application/json' || ext === 'json') return 'json';
    if (mime === 'text/html' || ext === 'html' || ext === 'htm') return 'html';
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'image';
    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'doc' ||
      ext === 'docx'
    ) return 'word';
    
    return 'pdf'; // Default fallback
  }

  // Handle JSON file (direct import, skips AI)
  const handleJSONFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const text = await file.text();
      let parsed: unknown;
      
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error('Invalid JSON file. Please check the file format.');
        setIsProcessing(false);
        return;
      }

      setParseStep('extracting');
      await new Promise(resolve => setTimeout(resolve, 200));

      const validated = validateAndCleanResumeData(parsed);
      const withNewIds = regenerateResumeIds(validated);
      const extraction = getExtractionSummary(withNewIds);

      if (extraction.isEmpty) {
        toast.error('No resume data found in JSON file.');
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 300));

      setPendingResumeData(withNewIds);
      setShowImportReview(true);
      toast.success('JSON imported! No AI processing needed.', { duration: 3000 });
    } catch (error) {
      console.error('Error parsing JSON:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse JSON file.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle HTML file
  const handleHTMLFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const html = await file.text();
      
      setParseStep('extracting');
      const text = extractTextFromHTML(html);

      if (!text.trim() || text.length < 50) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(text);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      setPendingResumeData(resumeData);
      setShowImportReview(true);
    } catch (error) {
      console.error('Error parsing HTML:', error);
      setErrorType('CORRUPTED');
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle Word document
  const handleWordFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setParseStep('extracting');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      if (!text.trim()) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(text);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      setPendingResumeData(resumeData);
      setShowImportReview(true);
    } catch (error) {
      console.error('Error parsing Word document:', error);
      setErrorType('CORRUPTED');
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle image file (OCR)
  const handleImageFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setShowErrorRecovery(false);
    setParseStep('reading');

    try {
      const progressCallback: OCRProgressCallback = (progress) => {
        setOcrProgress({ page: progress.page, total: progress.total, status: progress.status });
      };

      setParseStep('extracting');
      const text = await extractTextFromImage(file, progressCallback);

      if (!text.trim()) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('analyzing');
      const resumeData = await parseTextWithAI(text);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        setErrorType('NO_TEXT');
        setShowErrorRecovery(true);
        setIsProcessing(false);
        return;
      }

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      toast.warning(
        'Resume extracted via OCR. Please review all sections for accuracy.',
        { duration: 6000 }
      );

      setPendingResumeData(resumeData);
      setShowImportReview(true);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to extract text from image.',
        { duration: 5000 }
      );
      setErrorType('UNKNOWN');
      setShowErrorRecovery(true);
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, []);

  const handleFile = useCallback(async (file: File, fileType?: FileType) => {
    const detectedType = fileType || detectFileType(file);
    
    // Size check
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    // Close the import sheet when processing starts
    setShowImportSheet(false);

    // Route to appropriate handler
    if (detectedType === 'json') {
      await handleJSONFile(file);
      return;
    }

    if (detectedType === 'html') {
      await handleHTMLFile(file);
      return;
    }

    if (detectedType === 'word') {
      await handleWordFile(file);
      return;
    }

    if (detectedType === 'image') {
      await handleImageFile(file);
      return;
    }

    if (detectedType !== 'pdf') {
      toast.error('Unsupported file type. Please use PDF, Word, Image, JSON, or HTML files.');
      return;
    }

    // Existing PDF handling
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

      setParseStep('complete');
      await new Promise(resolve => setTimeout(resolve, 400));

      // Show import review sheet instead of navigating directly
      setPendingResumeData(resumeData);
      setShowImportReview(true);
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
  }, [handleWordFile, handleImageFile]);

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

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input value to allow re-selecting same file
    e.target.value = '';
    
    try {
      await handleFile(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Something went wrong. Please try again.');
      setIsProcessing(false);
    }
  }, [handleFile]);

  // Handle file selection from the new ImportUploadSheet
  const handleFileFromSheet = useCallback((file: File, type: FileType) => {
    handleFile(file, type);
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
              <UploadZone
                isDragging={isDragging}
                isProcessing={isProcessing}
                onUploadClick={() => !isProcessing && setShowImportSheet(true)}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {/* Hidden file input controlled by ref */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  className="hidden"
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
                      {isDragging ? 'Drop to Upload' : 'Upload Your Resume'}
                    </h2>
                    
                    <p className="text-muted-foreground text-center text-sm mb-4 max-w-[260px]">
                      Tap to choose file type, or drag and drop
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>PDF, Word, Image, JSON, HTML • max 10MB</span>
                    </div>
                  </>
                )}
              </UploadZone>

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
                    <li>✓ Text-based PDFs & Word docs work best</li>
                    <li>✓ Keep formatting simple</li>
                    <li>✓ Photos & scans? We'll use OCR</li>
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
      
      {/* Import Review Sheet */}
      <ImportReviewSheet
        open={showImportReview}
        onClose={handleImportReviewClose}
        onImport={handleImportConfirm}
        parsedData={pendingResumeData}
      />
      
      {/* Import Upload Sheet (replaces FileTypeSelector) */}
      <ImportUploadSheet
        open={showImportSheet}
        onClose={() => setShowImportSheet(false)}
        onFileSelect={handleFileFromSheet}
        isProcessing={isProcessing}
      />
    </div>
  );
}
