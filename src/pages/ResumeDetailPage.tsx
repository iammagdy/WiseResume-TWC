import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Eye, Download, Share2, Copy, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { useResume, useResumeMutations, dbToResumeData } from '@/hooks/useResumes';
import { useResumeScore } from '@/hooks/useResumeScore';
import { useResumeStore } from '@/store/resumeStore';
import { templates } from '@/lib/templateData';
import { formatDistanceToNow, format } from 'date-fns';
import { generatePDF } from '@/lib/pdfGenerator';
import { downloadFile } from '@/lib/downloadUtils';
import { useResumeShareMutations } from '@/hooks/useResumeShares';
import { toast } from 'sonner';
import { TemplateId } from '@/types/resume';

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbResume, isLoading } = useResume(id || null);
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const { scoreResume, getCachedScore, scoringId } = useResumeScore();
  const { createShare } = useResumeShareMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dbResume) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Resume not found</h2>
        <p className="text-muted-foreground mb-4">This resume may have been deleted.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const resumeData = dbToResumeData(dbResume);
  const templateInfo = templates.find(t => t.id === dbResume.template_id);
  const healthScore = getCachedScore(dbResume.id, dbResume.updated_at);

  const handleEdit = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/editor');
  };

  const handlePreview = () => {
    setCurrentResume(resumeData);
    setCurrentResumeId(dbResume.id);
    setSelectedTemplate(dbResume.template_id as TemplateId);
    navigate('/preview');
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const pdfBlob = await generatePDF(resumeData, dbResume.template_id as TemplateId, null, undefined, { showPageNumbers: true });
      const fileName = `${resumeData.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume'}.pdf`;
      await downloadFile({ blob: pdfBlob, fileName });
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDuplicate = () => {
    duplicateResume.mutate(dbResume.id, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const handleDelete = () => {
    deleteResume.mutate(dbResume.id, {
      onSuccess: () => navigate('/dashboard'),
    });
  };

  const actions = [
    { icon: Edit2, label: 'Edit', onClick: handleEdit },
    { icon: Eye, label: 'Preview', onClick: handlePreview },
    { icon: Download, label: 'Download', onClick: handleDownload, loading: isDownloading },
    { icon: Share2, label: 'Share', onClick: () => {
      createShare.mutate({ resumeId: dbResume.id }, {
        onSuccess: (data) => {
          const url = `${window.location.origin}/share/${data.token}`;
          navigator.clipboard.writeText(url);
          toast.success('Share link copied to clipboard!');
        },
      });
    }},
    { icon: Copy, label: 'Duplicate', onClick: handleDuplicate },
    { icon: Trash2, label: 'Delete', onClick: () => setDeleteOpen(true), destructive: true },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border glass-elevated backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate flex-1">{dbResume.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Template Preview */}
        <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-border shadow-lg">
          <TemplateThumbnail templateId={dbResume.template_id as TemplateId} resume={resumeData} />
        </div>

        {/* Health Score */}
        {healthScore && (
          <div className="flex items-center justify-center">
            <ScoreRing score={healthScore.overallScore} size={72} />
          </div>
        )}

        {/* Metadata */}
        <div className="glass-elevated rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Template</span>
            <Badge variant="secondary" className="text-xs">{templateInfo?.name || dbResume.template_id}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="text-foreground">{format(new Date(dbResume.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last edited</span>
            <span className="text-foreground">{formatDistanceToNow(new Date(dbResume.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-3 gap-3">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl glass-elevated hover:scale-[1.02] transition-all touch-manipulation active:scale-[0.98] min-h-[80px] ${
                action.destructive ? 'text-destructive' : 'text-foreground'
              }`}
              aria-label={action.label}
            >
              {action.loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <action.icon className="w-6 h-6" />
              )}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{dbResume.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
