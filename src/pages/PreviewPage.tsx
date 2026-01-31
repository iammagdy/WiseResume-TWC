import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, Loader2, FileText, Check } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/resumeStore';
import { ModernTemplate } from '@/components/templates/ModernTemplate';
import { ClassicTemplate } from '@/components/templates/ClassicTemplate';
import { MinimalTemplate } from '@/components/templates/MinimalTemplate';
import { ProfessionalTemplate } from '@/components/templates/ProfessionalTemplate';
import { DeveloperTemplate } from '@/components/templates/DeveloperTemplate';
import { CreativeTemplate } from '@/components/templates/CreativeTemplate';
import { ExecutiveTemplate } from '@/components/templates/ExecutiveTemplate';
import { generatePDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

export default function PreviewPage() {
  const navigate = useNavigate();
  const { currentResume, selectedTemplate } = useResumeStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  if (!currentResume) {
    navigate('/upload');
    return null;
  }

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Pass the ref element to ensure we capture the correct template
      const pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = currentResume.contactInfo.fullName 
        ? `${currentResume.contactInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Resume downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const pdfBlob = await generatePDF(currentResume, selectedTemplate, resumeRef.current);
        const file = new File([pdfBlob], 'Resume.pdf', { type: 'application/pdf' });
        await navigator.share({
          title: 'My Resume',
          files: [file],
        });
      } catch (error) {
        console.error('Share error:', error);
        toast.error('Failed to share. Try downloading instead.');
      }
    } else {
      toast.info('Share not supported. Downloading instead.');
      handleDownload();
    }
  };

  const TemplateComponent = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
    professional: ProfessionalTemplate,
    developer: DeveloperTemplate,
    creative: CreativeTemplate,
    executive: ExecutiveTemplate,
  }[selectedTemplate];

  return (
    <MobileLayout showHeader headerTitle="Preview" onBack={() => navigate('/editor')}>
      <div className="flex-1 flex flex-col">
        {/* Template indicator */}
        <motion.div
          className="px-4 py-3 flex items-center gap-3 border-b border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Template: <span className="font-medium text-foreground capitalize">{selectedTemplate}</span>
          </span>
          <Check className="w-5 h-5 text-success ml-auto" />
          <span className="text-sm text-success font-medium">ATS-Ready</span>
        </motion.div>

        {/* Preview area - scrollable for multi-page resumes */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <motion.div
            ref={resumeRef}
            data-resume-template
            className="bg-white text-black mx-auto shadow-2xl"
            style={{ 
              width: '100%',
              maxWidth: '612px',
              minHeight: '792px',
              // Remove aspectRatio to allow content to grow naturally
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <TemplateComponent resume={currentResume} />
          </motion.div>
        </div>

        {/* Bottom actions */}
        <motion.div
          className="sticky bottom-0 p-4 pb-safe glass border-t border-border space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary glow-primary"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => navigate('/editor')}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
