import { motion } from 'framer-motion';
import { Check, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useResumeStore } from '@/store/resumeStore';
import { TemplateId } from '@/types/resume';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const templates: { id: TemplateId; name: string; description: string }[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with accent colors',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional layout',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant design',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate-friendly template',
  },
];

export function TemplateSelector({ open, onOpenChange }: TemplateSelectorProps) {
  const { selectedTemplate, setSelectedTemplate, updateResume } = useResumeStore();

  const handleSelect = (id: TemplateId) => {
    setSelectedTemplate(id);
    updateResume({ templateId: id });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Choose Template
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelect(template.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all ${
                selectedTemplate === template.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Template preview placeholder */}
              <div className="aspect-[8.5/11] bg-muted rounded-lg mb-3 flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>

              <h3 className="font-semibold text-sm">{template.name}</h3>
              <p className="text-xs text-muted-foreground">{template.description}</p>

              {/* Selected indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
