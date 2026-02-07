import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, FileText, Briefcase, GraduationCap, Wrench, Award, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ResumeData } from '@/types/resume';

export interface SelectedSections {
  contactInfo: boolean;
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  certifications: boolean;
}

interface ImportReviewSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ResumeData, selectedSections: SelectedSections) => void;
  parsedData: ResumeData | null;
  isLoading?: boolean;
}

interface SectionCardProps {
  id: keyof SelectedSections;
  title: string;
  icon: React.ReactNode;
  count?: number;
  preview: string;
  isSelected: boolean;
  isEmpty: boolean;
  onToggle: (id: keyof SelectedSections) => void;
}

function SectionCard({ id, title, icon, count, preview, isSelected, isEmpty, onToggle }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-4 transition-all ${
        isEmpty 
          ? 'border-border/50 bg-muted/30 opacity-60' 
          : isSelected 
            ? 'border-primary/50 bg-primary/5' 
            : 'border-border bg-card/50'
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
        <div className="pt-0.5">
          <Checkbox
            checked={isSelected}
            disabled={isEmpty}
            onCheckedChange={() => onToggle(id)}
            className="h-5 w-5"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-muted-foreground">{icon}</span>
            <span className="font-medium text-sm">{title}</span>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {count}
              </Badge>
            )}
            {isEmpty && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                Not detected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {isEmpty ? 'No data found in this section' : preview}
          </p>
        </div>
      </label>
    </motion.div>
  );
}

export function ImportReviewSheet({ 
  open, 
  onClose, 
  onImport, 
  parsedData,
  isLoading = false 
}: ImportReviewSheetProps) {
  const [selectedSections, setSelectedSections] = useState<SelectedSections>({
    contactInfo: true,
    summary: true,
    experience: true,
    education: true,
    skills: true,
    certifications: true,
  });

  // Generate previews and counts for each section
  const sectionInfo = useMemo(() => {
    if (!parsedData) return null;

    const contactParts = [
      parsedData.contactInfo.fullName,
      parsedData.contactInfo.email,
      parsedData.contactInfo.phone,
    ].filter(Boolean);

    const experiencePreview = parsedData.experience
      .slice(0, 2)
      .map(exp => `${exp.position} at ${exp.company}`)
      .join(' • ');

    const educationPreview = parsedData.education
      .slice(0, 2)
      .map(edu => edu.institution)
      .join(' • ');

    const skillsPreview = parsedData.skills.slice(0, 6).join(', ');

    const certsPreview = parsedData.certifications
      .slice(0, 2)
      .map(cert => cert.name)
      .join(' • ');

    return {
      contactInfo: {
        preview: contactParts.join(' • ') || 'No contact info',
        isEmpty: contactParts.length === 0,
      },
      summary: {
        preview: parsedData.summary || 'No summary',
        isEmpty: !parsedData.summary || parsedData.summary.length < 10,
      },
      experience: {
        preview: experiencePreview || 'No experience entries',
        count: parsedData.experience.length,
        isEmpty: parsedData.experience.length === 0,
      },
      education: {
        preview: educationPreview || 'No education entries',
        count: parsedData.education.length,
        isEmpty: parsedData.education.length === 0,
      },
      skills: {
        preview: skillsPreview || 'No skills',
        count: parsedData.skills.length,
        isEmpty: parsedData.skills.length === 0,
      },
      certifications: {
        preview: certsPreview || 'No certifications',
        count: parsedData.certifications.length,
        isEmpty: parsedData.certifications.length === 0,
      },
    };
  }, [parsedData]);

  const handleToggle = (id: keyof SelectedSections) => {
    setSelectedSections(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;
  const totalSections = 6;

  const handleImport = () => {
    if (parsedData) {
      onImport(parsedData, selectedSections);
    }
  };

  if (!parsedData || !sectionInfo) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">AI Analysis Complete</SheetTitle>
              <SheetDescription className="text-xs">
                Select which sections to import
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            <SectionCard
              id="contactInfo"
              title="Contact Information"
              icon={<User className="w-4 h-4" />}
              preview={sectionInfo.contactInfo.preview}
              isSelected={selectedSections.contactInfo}
              isEmpty={sectionInfo.contactInfo.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="summary"
              title="Professional Summary"
              icon={<FileText className="w-4 h-4" />}
              preview={sectionInfo.summary.preview}
              isSelected={selectedSections.summary}
              isEmpty={sectionInfo.summary.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="experience"
              title="Work Experience"
              icon={<Briefcase className="w-4 h-4" />}
              count={sectionInfo.experience.count}
              preview={sectionInfo.experience.preview}
              isSelected={selectedSections.experience}
              isEmpty={sectionInfo.experience.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="education"
              title="Education"
              icon={<GraduationCap className="w-4 h-4" />}
              count={sectionInfo.education.count}
              preview={sectionInfo.education.preview}
              isSelected={selectedSections.education}
              isEmpty={sectionInfo.education.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="skills"
              title="Skills"
              icon={<Wrench className="w-4 h-4" />}
              count={sectionInfo.skills.count}
              preview={sectionInfo.skills.preview}
              isSelected={selectedSections.skills}
              isEmpty={sectionInfo.skills.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="certifications"
              title="Certifications"
              icon={<Award className="w-4 h-4" />}
              count={sectionInfo.certifications.count}
              preview={sectionInfo.certifications.preview}
              isSelected={selectedSections.certifications}
              isEmpty={sectionInfo.certifications.isEmpty}
              onToggle={handleToggle}
            />
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <Button 
            onClick={handleImport} 
            disabled={isLoading || selectedCount === 0}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <Check className="w-5 h-5 mr-2" />
            Import Selected ({selectedCount}/{totalSections})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
