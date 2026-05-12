import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, User, FileText, Briefcase, GraduationCap, Wrench,
  Award, Check, ChevronDown, ChevronUp, Globe, Heart, BookOpen,
  FolderOpen, AlertTriangle,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
  projects: boolean;
  awards: boolean;
  languages: boolean;
  volunteering: boolean;
  publications: boolean;
}

export interface ContactEdits {
  fullName: string;
  email: string;
}

interface ImportReviewSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ResumeData, selectedSections: SelectedSections, contactEdits: ContactEdits) => void;
  parsedData: ResumeData | null;
  isLoading?: boolean;
  atsScore?: ResumeHealthScore | null;
  isScoring?: boolean;
  lowConfidenceFields?: string[];
}

interface SectionDef {
  id: keyof SelectedSections;
  title: string;
  icon: React.ReactNode;
  count?: number;
  preview: string;
  isEmpty: boolean;
  expandedContent?: React.ReactNode;
  hasLowConfidence?: boolean;
}

interface SectionCardProps extends SectionDef {
  isSelected: boolean;
  onToggle: (id: keyof SelectedSections) => void;
}

function ConfidenceBadge({ hasLowConfidence, isEmpty }: { hasLowConfidence: boolean; isEmpty: boolean }) {
  if (isEmpty) return (
    <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground shrink-0">
      Not detected
    </Badge>
  );
  if (hasLowConfidence) return (
    <Badge className="text-xs px-1.5 py-0 shrink-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15">
      <AlertTriangle className="w-2.5 h-2.5 mr-1" />
      Needs Review
    </Badge>
  );
  return (
    <Badge className="text-xs px-1.5 py-0 shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15">
      <Check className="w-2.5 h-2.5 mr-1" />
      Detected
    </Badge>
  );
}

function SectionCard({
  id, title, icon, count, preview, isSelected, isEmpty, onToggle,
  expandedContent, hasLowConfidence = false,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = !!expandedContent && !isEmpty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border transition-all ${
        isEmpty
          ? 'border-border bg-muted opacity-60'
          : isSelected
            ? hasLowConfidence
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-primary/50 bg-primary/5'
            : 'border-border bg-card'
      }`}
    >
      <label className="flex items-start gap-3 p-4 cursor-pointer touch-manipulation min-h-[72px]">
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
              <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{count}</Badge>
            )}
            <ConfidenceBadge hasLowConfidence={hasLowConfidence} isEmpty={isEmpty} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
            {isEmpty ? 'No data found in this section' : preview}
          </p>
        </div>
        {canExpand && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setIsExpanded(v => !v); }}
            className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center touch-manipulation"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>
        )}
      </label>

      <AnimatePresence>
        {isExpanded && canExpand && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border/50">
              {expandedContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  lowConfidenceFields = [],
}: ImportReviewSheetProps) {
  const [selectedSections, setSelectedSections] = useState<SelectedSections>({
    contactInfo: true,
    summary: true,
    experience: true,
    education: true,
    skills: true,
    certifications: true,
    projects: true,
    awards: true,
    languages: true,
    volunteering: true,
    publications: true,
  });

  const [contactEdits, setContactEdits] = useState<ContactEdits>({ fullName: '', email: '' });

  const handleToggle = useCallback((id: keyof SelectedSections) => {
    setSelectedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const lcSet = useMemo(() => new Set(lowConfidenceFields.map(f => f.toLowerCase())), [lowConfidenceFields]);

  const sectionHasLowConfidence = useCallback((sectionName: string) => {
    return lowConfidenceFields.some(f => f.toLowerCase().startsWith(sectionName.toLowerCase()));
  }, [lowConfidenceFields]);

  const sections = useMemo((): SectionDef[] => {
    if (!parsedData) return [];

    const contactParts = [
      parsedData.contactInfo.fullName,
      parsedData.contactInfo.email,
      parsedData.contactInfo.phone,
    ].filter(Boolean);

    const experiencePreview = parsedData.experience
      .slice(0, 2)
      .map(e => `${e.position} at ${e.company}`)
      .join(' • ');

    const educationPreview = parsedData.education
      .slice(0, 2)
      .map(e => e.institution)
      .join(' • ');

    const skillsPreview = parsedData.skills.slice(0, 6).join(', ');

    const certsPreview = parsedData.certifications
      .slice(0, 2)
      .map(c => c.name)
      .join(' • ');

    const projectsPreview = (parsedData.projects || [])
      .slice(0, 2)
      .map(p => p.name)
      .join(' • ');

    const awardsPreview = (parsedData.awards || [])
      .slice(0, 2)
      .map(a => a.title)
      .join(' • ');

    const languagesPreview = (parsedData.languages || [])
      .slice(0, 4)
      .map(l => l.name + (l.proficiency ? ` (${l.proficiency})` : ''))
      .join(', ');

    const volPreview = (parsedData.volunteering || [])
      .slice(0, 2)
      .map(v => `${v.role} at ${v.organization}`)
      .join(' • ');

    const pubsPreview = (parsedData.publications || [])
      .slice(0, 2)
      .map(p => p.title)
      .join(' • ');

    const hasNameLc = lcSet.has('full name') || lcSet.has('fullname') || sectionHasLowConfidence('full name');
    const hasEmailLc = lcSet.has('email') || sectionHasLowConfidence('email');
    const contactHasLc = hasNameLc || hasEmailLc || sectionHasLowConfidence('contact');

    return [
      {
        id: 'contactInfo',
        title: 'Contact Info',
        icon: <User className="w-4 h-4" />,
        preview: contactParts.join(' • ') || 'No contact info',
        isEmpty: contactParts.length === 0,
        hasLowConfidence: contactHasLc,
        expandedContent: (
          <div className="pt-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">Edit before importing:</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Full name</label>
                <Input
                  value={contactEdits.fullName || parsedData.contactInfo.fullName}
                  onChange={(e) => setContactEdits(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Your full name"
                  className="h-9 text-sm mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input
                  value={contactEdits.email || parsedData.contactInfo.email}
                  onChange={(e) => setContactEdits(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  type="email"
                  className="h-9 text-sm mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {parsedData.contactInfo.phone && (
                <p className="text-xs text-muted-foreground">Phone: {parsedData.contactInfo.phone}</p>
              )}
              {parsedData.contactInfo.location && (
                <p className="text-xs text-muted-foreground">Location: {parsedData.contactInfo.location}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'summary',
        title: 'Summary',
        icon: <FileText className="w-4 h-4" />,
        preview: parsedData.summary || 'No summary',
        isEmpty: !parsedData.summary || parsedData.summary.length < 10,
        hasLowConfidence: sectionHasLowConfidence('summary'),
        expandedContent: parsedData.summary ? (
          <p className="pt-3 text-xs text-muted-foreground leading-relaxed line-clamp-6">
            {parsedData.summary}
          </p>
        ) : null,
      },
      {
        id: 'experience',
        title: 'Experience',
        icon: <Briefcase className="w-4 h-4" />,
        count: parsedData.experience.length,
        preview: experiencePreview || 'No experience entries',
        isEmpty: parsedData.experience.length === 0,
        hasLowConfidence: sectionHasLowConfidence('experience'),
        expandedContent: parsedData.experience.length > 0 ? (
          <div className="pt-3 space-y-2">
            {parsedData.experience.slice(0, 4).map((exp, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-foreground">{exp.position} · {exp.company}</p>
                {(exp.startDate || exp.endDate) && (
                  <p className="text-muted-foreground">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</p>
                )}
              </div>
            ))}
            {parsedData.experience.length > 4 && (
              <p className="text-xs text-muted-foreground">+{parsedData.experience.length - 4} more</p>
            )}
          </div>
        ) : null,
      },
      {
        id: 'education',
        title: 'Education',
        icon: <GraduationCap className="w-4 h-4" />,
        count: parsedData.education.length,
        preview: educationPreview || 'No education entries',
        isEmpty: parsedData.education.length === 0,
        hasLowConfidence: sectionHasLowConfidence('education'),
        expandedContent: parsedData.education.length > 0 ? (
          <div className="pt-3 space-y-2">
            {parsedData.education.slice(0, 3).map((edu, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-foreground">{edu.institution}</p>
                <p className="text-muted-foreground">{edu.degree}{edu.field ? ` · ${edu.field}` : ''}</p>
              </div>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'skills',
        title: 'Skills',
        icon: <Wrench className="w-4 h-4" />,
        count: parsedData.skills.length,
        preview: skillsPreview || 'No skills',
        isEmpty: parsedData.skills.length === 0,
        hasLowConfidence: sectionHasLowConfidence('skills'),
        expandedContent: parsedData.skills.length > 0 ? (
          <div className="pt-3 flex flex-wrap gap-1.5">
            {parsedData.skills.slice(0, 20).map((skill, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                {skill}
              </span>
            ))}
            {parsedData.skills.length > 20 && (
              <span className="text-xs text-muted-foreground">+{parsedData.skills.length - 20} more</span>
            )}
          </div>
        ) : null,
      },
      {
        id: 'certifications',
        title: 'Certifications',
        icon: <Award className="w-4 h-4" />,
        count: parsedData.certifications.length,
        preview: certsPreview || 'No certifications',
        isEmpty: parsedData.certifications.length === 0,
        hasLowConfidence: sectionHasLowConfidence('certifications'),
        expandedContent: parsedData.certifications.length > 0 ? (
          <div className="pt-3 space-y-1">
            {parsedData.certifications.slice(0, 4).map((cert, i) => (
              <p key={i} className="text-xs text-muted-foreground">{cert.name}{cert.issuer ? ` · ${cert.issuer}` : ''}</p>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'projects',
        title: 'Projects',
        icon: <FolderOpen className="w-4 h-4" />,
        count: (parsedData.projects || []).length,
        preview: projectsPreview || 'No projects',
        isEmpty: (parsedData.projects || []).length === 0,
        hasLowConfidence: sectionHasLowConfidence('projects'),
        expandedContent: (parsedData.projects || []).length > 0 ? (
          <div className="pt-3 space-y-2">
            {(parsedData.projects || []).slice(0, 3).map((proj, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-foreground">{proj.name}</p>
                {proj.technologies && proj.technologies.length > 0 && (
                  <p className="text-muted-foreground">{proj.technologies.slice(0, 4).join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'awards',
        title: 'Awards',
        icon: <Award className="w-4 h-4" />,
        count: (parsedData.awards || []).length,
        preview: awardsPreview || 'No awards',
        isEmpty: (parsedData.awards || []).length === 0,
        hasLowConfidence: sectionHasLowConfidence('awards'),
        expandedContent: (parsedData.awards || []).length > 0 ? (
          <div className="pt-3 space-y-1">
            {(parsedData.awards || []).slice(0, 4).map((award, i) => (
              <p key={i} className="text-xs text-muted-foreground">{award.title}{award.issuer ? ` · ${award.issuer}` : ''}</p>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'languages',
        title: 'Languages',
        icon: <Globe className="w-4 h-4" />,
        count: (parsedData.languages || []).length,
        preview: languagesPreview || 'No languages',
        isEmpty: (parsedData.languages || []).length === 0,
        hasLowConfidence: sectionHasLowConfidence('languages'),
        expandedContent: (parsedData.languages || []).length > 0 ? (
          <div className="pt-3 flex flex-wrap gap-1.5">
            {(parsedData.languages || []).map((lang, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                {lang.name}{lang.proficiency ? ` · ${lang.proficiency}` : ''}
              </span>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'volunteering',
        title: 'Volunteering',
        icon: <Heart className="w-4 h-4" />,
        count: (parsedData.volunteering || []).length,
        preview: volPreview || 'No volunteering',
        isEmpty: (parsedData.volunteering || []).length === 0,
        hasLowConfidence: sectionHasLowConfidence('volunteering'),
        expandedContent: (parsedData.volunteering || []).length > 0 ? (
          <div className="pt-3 space-y-2">
            {(parsedData.volunteering || []).slice(0, 3).map((vol, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-foreground">{vol.role} · {vol.organization}</p>
              </div>
            ))}
          </div>
        ) : null,
      },
      {
        id: 'publications',
        title: 'Publications',
        icon: <BookOpen className="w-4 h-4" />,
        count: (parsedData.publications || []).length,
        preview: pubsPreview || 'No publications',
        isEmpty: (parsedData.publications || []).length === 0,
        hasLowConfidence: sectionHasLowConfidence('publications'),
        expandedContent: (parsedData.publications || []).length > 0 ? (
          <div className="pt-3 space-y-1">
            {(parsedData.publications || []).slice(0, 3).map((pub, i) => (
              <p key={i} className="text-xs text-muted-foreground">{pub.title}{pub.publisher ? ` · ${pub.publisher}` : ''}</p>
            ))}
          </div>
        ) : null,
      },
    ];
  }, [parsedData, lcSet, sectionHasLowConfidence, contactEdits]);

  const nonEmptySections = useMemo(() => sections.filter(s => !s.isEmpty), [sections]);
  const selectedCount = useMemo(
    () => nonEmptySections.filter(s => selectedSections[s.id]).length,
    [nonEmptySections, selectedSections]
  );
  const totalSections = nonEmptySections.length;
  const lowConfidenceCount = useMemo(
    () => nonEmptySections.filter(s => s.hasLowConfidence).length,
    [nonEmptySections]
  );

  const handleImport = useCallback(() => {
    if (!parsedData) return;
    const edits: ContactEdits = {
      fullName: contactEdits.fullName || parsedData.contactInfo.fullName,
      email: contactEdits.email || parsedData.contactInfo.email,
    };
    onImport(parsedData, selectedSections, edits);
  }, [parsedData, selectedSections, contactEdits, onImport]);

  if (!parsedData) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] max-h-[92vh] flex flex-col">
        <SheetHeader className="text-left pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">AI Analysis Complete</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {lowConfidenceCount > 0
                  ? `${lowConfidenceCount} section${lowConfidenceCount > 1 ? 's' : ''} need review — tap to expand`
                  : 'Select sections to import'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <div className="space-y-3 pb-6">
            {(isScoring || atsScore) && (
              <ATSScorePreview atsScore={atsScore} isScoring={isScoring ?? false} />
            )}

            {lowConfidenceCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Tap the <ChevronDown className="inline w-3 h-3" /> button on amber sections to review and correct details before importing.
                </p>
              </div>
            )}

            {sections.map(section => (
              <SectionCard
                key={section.id}
                {...section}
                isSelected={selectedSections[section.id]}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </ScrollArea>

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
