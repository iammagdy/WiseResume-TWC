import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Copy, ArrowRight, GitBranch } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
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
import { useResumeMutations, DatabaseResume, dbToResumeData } from '@/hooks/useResumes';
import haptics from '@/lib/haptics';
import { useResumeStore } from '@/store/resumeStore';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';
import { getUserId } from '@/lib/supabaseBridge';
import { useProfile } from '@/hooks/useProfile';
import { Json } from '@/integrations/supabase/types';
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
  parentResumeId?: string | null;
  defaultTemplateId?: string | null;
}

type CreateMode = 'blank' | 'upload' | 'duplicate' | 'tailored';

export function CreateResumeDialog({
  open,
  onOpenChange,
  existingResumes = [],
  parentResumeId,
  defaultTemplateId,
}: CreateResumeDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { createResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();
  
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [title, setTitle] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-set mode to tailored when parentResumeId is provided
  useEffect(() => {
    if (parentResumeId && open) {
      setMode('tailored');
      const parentResume = existingResumes.find(r => r.id === parentResumeId);
      if (parentResume) {
        setTitle(`${parentResume.title} - Tailored`);
      }
    }
  }, [parentResumeId, open, existingResumes]);

  const handleStartBlank = async () => {
    if (!title.trim()) return;
    
    // Guest fallback: create local-only resume
    if (!user) {
      const guestId = uuidv4();
      setCurrentResumeId(guestId);
      setCurrentResume({
        id: guestId,
        contactInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        templateId: defaultTemplateId || 'modern',
      });
      onOpenChange(false);
      navigate('/editor');
      return;
    }

    setIsCreating(true);
    try {
      const newResume = await createResume.mutateAsync({
        resume: {
          contactInfo: { 
            fullName: profile?.fullName || '', 
            email: '', 
            phone: '', 
            location: profile?.location || '',
            linkedin: profile?.linkedinUrl || '',
          },
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          templateId: defaultTemplateId || 'modern',
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

  // Handle creating a tailored version
  const handleCreateTailored = async () => {
    if (!title.trim() || !parentResumeId || !user) return;
    
    const parentResume = existingResumes.find(r => r.id === parentResumeId);
    if (!parentResume) return;
    
    setIsCreating(true);
    try {
      // Create a copy with parent_resume_id set
      const { data: newResume, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          contact_info: parentResume.contact_info as unknown as Json,
          summary: parentResume.summary,
          experience: parentResume.experience as unknown as Json,
          education: parentResume.education as unknown as Json,
          skills: parentResume.skills as unknown as Json,
          certifications: parentResume.certifications as unknown as Json,
          template_id: parentResume.template_id,
          target_job_title: parentResume.target_job_title,
          target_company: parentResume.target_company,
          parent_resume_id: parentResumeId,
          is_primary: false,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentResumeId(newResume.id);
      setCurrentResume({
        id: newResume.id,
        contactInfo: parentResume.contact_info,
        summary: parentResume.summary,
        experience: parentResume.experience || [],
        education: parentResume.education || [],
        skills: parentResume.skills || [],
        certifications: parentResume.certifications || [],
        templateId: parentResume.template_id,
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
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
        </DialogHeader>

        {!mode ? (
          /* Mode Selection */
          <div className="space-y-3 py-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptics.light(); setMode('blank'); }}
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
              onClick={() => { haptics.light(); handleUpload(); }}
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
                onClick={() => { haptics.light(); setMode('duplicate'); }}
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
        ) : mode === 'tailored' ? (
          /* Tailored Version Form */
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <GitBranch className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Creating Tailored Version</p>
                <p className="text-xs text-muted-foreground">
                  This will be linked to the master resume
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tailored-title">Version Title</Label>
              <Input
                id="tailored-title"
                placeholder="e.g., Google SWE Application"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give this tailored version a descriptive name
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetAndClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTailored}
                disabled={!title.trim() || isCreating}
                className="flex-1 gradient-primary"
              >
                {isCreating ? 'Creating...' : 'Create Tailored'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
