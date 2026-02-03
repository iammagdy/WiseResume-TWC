import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Copy, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeMutations, DatabaseResume } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingResumes?: DatabaseResume[];
}

type CreateMode = 'blank' | 'upload' | 'duplicate';

export function CreateResumeDialog({
  open,
  onOpenChange,
  existingResumes = [],
}: CreateResumeDialogProps) {
  const navigate = useNavigate();
  const { createResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [title, setTitle] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartBlank = async () => {
    if (!title.trim()) return;
    
    setIsCreating(true);
    try {
      const newResume = await createResume.mutateAsync({
        resume: {
          contactInfo: { fullName: '', email: '', phone: '', location: '' },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          templateId: 'modern',
        },
        title: title.trim(),
      });
      
      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary,
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id,
      });
      
      onOpenChange(false);
      navigate('/editor');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpload = () => {
    onOpenChange(false);
    navigate('/upload');
  };

  const handleDuplicate = async () => {
    if (!selectedResumeId) return;
    
    setIsCreating(true);
    try {
      const newResume = await duplicateResume.mutateAsync(selectedResumeId);
      
      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: newResume.contact_info,
        summary: newResume.summary,
        experience: newResume.experience || [],
        education: newResume.education || [],
        skills: newResume.skills || [],
        certifications: newResume.certifications || [],
        templateId: newResume.template_id,
      });
      
      onOpenChange(false);
      navigate('/editor');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    setMode(null);
    setTitle('');
    setSelectedResumeId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
        </DialogHeader>

        {!mode ? (
          /* Mode Selection */
          <div className="space-y-3 py-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('blank')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Start from Scratch</p>
                <p className="text-sm text-muted-foreground">Build step by step with AI</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Upload PDF</p>
                <p className="text-sm text-muted-foreground">Extract and enhance existing resume</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            {existingResumes.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('duplicate')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all touch-manipulation"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Copy className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Duplicate Existing</p>
                  <p className="text-sm text-muted-foreground">Copy and customize a resume</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        ) : mode === 'blank' ? (
          /* Blank Resume Form */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resume Title</Label>
              <Input
                id="title"
                placeholder="e.g., Software Engineer Resume"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your resume a name to identify it later
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartBlank}
                disabled={!title.trim() || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        ) : mode === 'duplicate' ? (
          /* Duplicate Resume Form */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Resume to Duplicate</Label>
              <Select
                value={selectedResumeId}
                onValueChange={setSelectedResumeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {existingResumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleDuplicate}
                disabled={!selectedResumeId || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Duplicating...' : 'Duplicate'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
