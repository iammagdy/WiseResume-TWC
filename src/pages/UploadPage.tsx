import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { parseResumePDF, getExtractionSummary, PDFParseError } from '@/lib/pdfParser';
import { toast } from 'sonner';

export default function UploadPage() {
  const navigate = useNavigate();
  const { setCurrentResume } = useResumeStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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
      const resumeData = await parseResumePDF(file);
      const extraction = getExtractionSummary(resumeData);

      if (extraction.isEmpty) {
        toast.error(
          'Could not extract any content from this PDF. This may be a scanned document or image-based PDF.',
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
          className={`flex-1 min-h-[300px] rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 ${
            isDragging 
              ? 'border-primary bg-primary/10 glow-primary' 
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
              <p className="text-lg font-semibold mb-2">Processing Resume</p>
              <p className="text-sm text-muted-foreground text-center">
                Extracting your information...
              </p>
              {fileName && (
                <p className="text-xs text-muted-foreground mt-2 truncate max-w-[200px]">
                  {fileName}
                </p>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div
                className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 glow-primary"
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
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
              
              <p className="text-muted-foreground text-center text-sm mb-4">
                Drag and drop your PDF resume here, or tap to browse
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>PDF files only, max 10MB</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Tips */}
        <motion.div
          className="mt-6 p-4 rounded-2xl glass border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Tips for best results</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use a text-based PDF (not scanned image)</li>
                <li>• Keep formatting simple and clean</li>
                <li>• Include all relevant sections</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Skip option */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              setCurrentResume({
                contactInfo: { fullName: '', email: '', phone: '', location: '' },
                summary: '',
                experience: [],
                education: [],
                skills: [],
                certifications: [],
                templateId: 'modern',
              });
              navigate('/editor');
            }}
          >
            Or start with a blank resume
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
