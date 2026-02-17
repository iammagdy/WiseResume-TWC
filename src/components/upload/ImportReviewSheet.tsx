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
import { ATSScorePreview } from '@/components/upload/ATSScorePreview';
import type { ResumeData } from '@/types/resume';
import type { ResumeHealthScore } from '@/hooks/useResumeScore';

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
  atsScore?: ResumeHealthScore | null;
  isScoring?: boolean;
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
      className={`relative rounded-2xl border transition-all active:scale-[0.98] ${
        isEmpty 
          ? 'border-border/50 bg-muted/30 opacity-60' 
          : isSelected 
            ? 'border-primary/50 bg-primary/5' 
            : 'border-border bg-card/50'
      }`}
    >
      <label className="flex items-start gap-3 p-4 cursor-pointer touch-manipulation min-h-[72px]">
        {/* Larger checkbox touch target for mobile */}
        <div className="flex items-center justify-center w-10 h-10 -m-2 shrink-0">
          <Checkbox
            checked={isSelected}
            disabled={isEmpty}
            onCheckedChange={() => onToggle(id)}
            className="h-6 w-6 rounded-md"
          />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-muted-foreground shrink-0">{icon}</span>
            <span className="font-medium text-sm">{title}</span>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
                {count}
              </Badge>
            )}
            {isEmpty && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground shrink-0">
                Not detected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
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
  isLoading = false,
  atsScore = null,
  isScoring = false,
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
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {/* Header */}
        <SheetHeader className="text-left pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">AI Analysis Complete</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Select sections to import
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-3 pb-6">
            {/* ATS Score Preview */}
            {(isScoring || atsScore) && (
              <ATSScorePreview atsScore={atsScore} isScoring={isScoring} />
            )}

            <SectionCard
              id="contactInfo"
              title="Contact Info"
              icon={<User className="w-4 h-4" />}
              preview={sectionInfo.contactInfo.preview}
              isSelected={selectedSections.contactInfo}
              isEmpty={sectionInfo.contactInfo.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="summary"
              title="Summary"
              icon={<FileText className="w-4 h-4" />}
              preview={sectionInfo.summary.preview}
              isSelected={selectedSections.summary}
              isEmpty={sectionInfo.summary.isEmpty}
              onToggle={handleToggle}
            />
            
            <SectionCard
              id="experience"
              title="Experience"
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

        {/* Fixed footer with safe area */}
        <div className="pt-4 pb-safe border-t border-border shrink-0">
          <Button 
            onClick={handleImport} 
            disabled={isLoading || selectedCount === 0}
            className="w-full h-14 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform"
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
