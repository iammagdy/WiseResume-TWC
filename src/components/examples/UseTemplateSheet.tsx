import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Palette, LayoutTemplate, Copy } from 'lucide-react';
import { useResumeMutations } from '@/hooks/useResumes';
import { useResumeStore } from '@/store/resumeStore';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import type { ResumeExample } from '@/types/resumeExamples';
import type { ResumeData } from '@/types/resume';

interface Props {
  example: ResumeExample | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const options = [
  {
    key: 'design' as const,
    icon: Palette,
    title: 'Design Only',
    description: 'Empty resume with this template style',
  },
  {
    key: 'structure' as const,
    icon: LayoutTemplate,
    title: 'Design + Structure',
    description: 'Section headings with empty content',
  },
  {
    key: 'full' as const,
    icon: Copy,
    title: 'Use as Starting Point',
    description: 'Full example content — edit to make it yours',
  },
];

export function UseTemplateSheet({ example, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { createResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId } = useResumeStore();

  if (!example) return null;

  const handleSelect = (key: 'design' | 'structure' | 'full') => {
    haptics.success();

    const emptyContact = { fullName: '', email: '', phone: '', location: '' };

    let resume: ResumeData;

    switch (key) {
      case 'design':
        resume = {
          contactInfo: emptyContact,
          summary: '',
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          templateId: example.templateId,
        };
        break;
      case 'structure':
        resume = {
          contactInfo: emptyContact,
          summary: '',
          experience: example.resumeData.experience.map(e => ({
            ...e,
            id: crypto.randomUUID(),
            company: '',
            position: '',
            description: '',
            achievements: [],
          })),
          education: example.resumeData.education.map(e => ({
            ...e,
            id: crypto.randomUUID(),
            institution: '',
            degree: '',
            field: '',
          })),
          skills: [],
          certifications: [],
          templateId: example.templateId,
        };
        break;
      case 'full':
      default:
        resume = {
          ...example.resumeData,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        };
        break;
    }

    createResume.mutate(
      { resume, title: `${example.title} Resume` },
      {
        onSuccess: (data) => {
          setCurrentResumeId(data.id);
          setCurrentResume(resume);
          onOpenChange(false);
          navigate('/editor');
          toast.success('Resume created from example');
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-fluid-base">How would you like to use this?</SheetTitle>
        </SheetHeader>
        <div className="space-y-3">
          {options.map(({ key, icon: Icon, title, description }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="w-full flex items-center gap-3 p-4 rounded-xl glass-elevated active:scale-[0.97] transition-transform touch-manipulation text-left"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
