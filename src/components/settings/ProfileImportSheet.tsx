import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Linkedin,
  Sparkles,
  Check,
  Briefcase,
  GraduationCap,
  Lightbulb,
  FileText,
  Copy,
  ChevronRight,
  AlertCircle,
  Upload,
  User,
  Wand2,
  SkipForward,
  ShieldCheck,
  Globe,
  Award,
  FileBarChart,
  X,
  Zap,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseResumePDF, parseResumePDFWithOCR } from '@/lib/pdfParser';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { cn } from '@/lib/utils';

export interface ProfileData {
  summary: string | null;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    description: string;
    current: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    description?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    organization: string;
    date: string;
  }>;
  volunteering?: Array<{
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
}

type Platform = 'linkedin' | 'indeed' | 'xing' | 'wellfound' | 'generic';

interface ProfileImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: Partial<ProfileData>) => void;
  defaultPlatform?: Platform;
  existingExperience?: Array<{ company: string; startDate?: string; endDate?: string }>;
  linkedinUsername?: string;
}

type ParseState =
  | 'method-select'
  | 'quick-paste'
  | 'quick-analyzing'
  | 'wizard'
  | 'step-analyzing'
  | 'step-result'
  | 'parsing'
  | 'preview'
  | 'importing'
  | 'done';

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', color: 'text-[#0A66C2]' },
  { id: 'indeed', label: 'Indeed', color: 'text-[#003A9B]' },
  { id: 'xing', label: 'Xing', color: 'text-[#026466]' },
  { id: 'wellfound', label: 'Wellfound', color: 'text-[#e65e4e]' },
  { id: 'generic', label: 'Other', color: 'text-muted-foreground' },
];

const PARSING_STEPS = [
  { id: 1, label: 'Reading profile data...', icon: FileText },
  { id: 2, label: 'Extracting experience...', icon: Briefcase },
  { id: 3, label: 'Analyzing skills...', icon: Lightbulb },
  { id: 4, label: 'Structuring education...', icon: GraduationCap },
];

const GUIDE_STEPS = [
  {
    icon: User,
    title: 'About / Summary',
    sectionKey: 'summary' as const,
    description: 'Copy your "About" section from the top of your profile',
    tip: 'Look for the About section below your profile photo',
    placeholder: 'Paste your About/Summary section here...',
  },
  {
    icon: Briefcase,
    title: 'Experience',
    sectionKey: 'experience' as const,
    description: 'Copy all your job titles, companies, dates, and descriptions',
    tip: 'Scroll to the Experience section and select everything',
    placeholder: 'Paste your work experience here — job titles, companies, dates, descriptions...',
  },
  {
    icon: GraduationCap,
    title: 'Education',
    sectionKey: 'education' as const,
    description: 'Copy your degrees, schools, and graduation years',
    tip: 'Find the Education section below Experience',
    placeholder: 'Paste your education details here — schools, degrees, years...',
  },
  {
    icon: Lightbulb,
    title: 'Skills',
    sectionKey: 'skills' as const,
    description: 'Copy your listed skills — or just type them out',
    tip: 'Look for the Skills section or "Show all skills"',
    placeholder: 'Paste or type your skills here — comma separated or one per line...',
  },
];

function parseYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

function yearsOverlap(
  aStart?: string | null, aEnd?: string | null,
  bStart?: string | null, bEnd?: string | null,
): boolean {
  const aS = parseYear(aStart);
  const aE = parseYear(aEnd) ?? new Date().getFullYear();
  const bS = parseYear(bStart);
  const bE = parseYear(bEnd) ?? new Date().getFullYear();
  if (!aS || !bS) return true;
  return aS <= bE && bS <= aE;
}

export function ProfileImportSheet({
  open,
  onOpenChange,
  onImport,
  defaultPlatform = 'linkedin',
  existingExperience,
  linkedinUsername: _linkedinUsername,
}: ProfileImportSheetProps) {
  const [platform, setPlatform] = useState<Platform>(defaultPlatform);
  const [parseState, setParseState] = useState<ParseState>('method-select');
  const [activeGuideStep, setActiveGuideStep] = useState(0);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [stepText, setStepText] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [accumulatedData, setAccumulatedData] = useState<Partial<ProfileData>>({});
  const [stepResult, setStepResult] = useState<Partial<ProfileData> | null>(null);
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    experience: true,
    education: true,
    skills: true,
    certifications: true,
    volunteering: true,
    languages: true,
    projects: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [editingExpIdx, setEditingExpIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platformLabel = PLATFORMS.find((p) => p.id === platform)?.label ?? 'LinkedIn';

  const callParseApi = useCallback(async (text: string): Promise<Partial<ProfileData>> => {
    const { data, error: fnError } = await edgeFunctions.functions.invoke('parse-linkedin', {
      body: { profileText: text.trim(), platform },
    });
    if (fnError) throw fnError;
    if (data?.error === 'URL_ONLY_REJECTED') throw new Error(data.message);
    if (data?.error) throw new Error(data.message || data.error);
    return data as Partial<ProfileData>;
  }, [platform]);

  const handleQuickAnalyze = async () => {
    if (!quickPasteText.trim()) {
      toast.error('Please paste your profile text first');
      return;
    }
    setParseState('quick-analyzing');
    setError(null);
    haptics.light();
    try {
      const result = await callParseApi(quickPasteText);
      setAccumulatedData(result);
      setParseState('preview');
      haptics.success();
    } catch (err) {
      console.error('Profile parse error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to analyze';
      setError(msg);
      setParseState('quick-paste');
      haptics.error();
      toast.error('Failed to analyze profile');
    }
  };

  const handleStepAnalyze = async () => {
    if (!stepText.trim()) {
      toast.error('Please paste some content first');
      return;
    }
    setParseState('step-analyzing');
    setError(null);
    haptics.light();
    try {
      const result = await callParseApi(stepText);
      setStepResult(result);
      setParseState('step-result');
      haptics.success();
    } catch (err) {
      console.error('Profile parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze');
      setParseState('wizard');
      haptics.error();
      toast.error('Failed to analyze content');
    }
  };

  const handleStepNext = () => {
    if (stepResult) {
      setAccumulatedData((prev) => ({
        ...prev,
        ...(stepResult.summary ? { summary: stepResult.summary } : {}),
        ...(stepResult.experience?.length ? { experience: [...(prev.experience || []), ...stepResult.experience] } : {}),
        ...(stepResult.education?.length ? { education: [...(prev.education || []), ...stepResult.education] } : {}),
        ...(stepResult.skills?.length ? { skills: [...new Set([...(prev.skills || []), ...stepResult.skills])] } : {}),
        ...(stepResult.certifications?.length ? { certifications: [...(prev.certifications || []), ...stepResult.certifications] } : {}),
        ...(stepResult.volunteering?.length ? { volunteering: [...(prev.volunteering || []), ...stepResult.volunteering] } : {}),
        ...(stepResult.languages?.length ? { languages: [...(prev.languages || []), ...stepResult.languages] } : {}),
        ...(stepResult.projects?.length ? { projects: [...(prev.projects || []), ...stepResult.projects] } : {}),
      }));
    }
    setStepText('');
    setStepResult(null);
    setError(null);
    if (activeGuideStep < GUIDE_STEPS.length - 1) {
      setActiveGuideStep((prev) => prev + 1);
      setParseState('wizard');
    } else {
      setParseState('preview');
    }
    haptics.light();
  };

  const handleSkipStep = () => {
    setStepText('');
    setStepResult(null);
    setError(null);
    if (activeGuideStep < GUIDE_STEPS.length - 1) {
      setActiveGuideStep((prev) => prev + 1);
    } else {
      setParseState('preview');
    }
    haptics.light();
  };

  const handlePdfUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    setUploadingPdf(true);
    setParseState('parsing');
    setError(null);
    setCurrentStep(0);
    haptics.light();

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < PARSING_STEPS.length - 1 ? prev + 1 : prev));
    }, 800);

    try {
      const parseResult = await parseResumePDF(file);
      let resumeData = parseResult.data;
      if (parseResult.needsOCR) {
        const { data: ocrData } = await parseResumePDFWithOCR(file);
        resumeData = ocrData;
      }
      if (!resumeData) throw new Error('Could not extract content from this PDF');

      clearInterval(stepInterval);

      const profileData: ProfileData = {
        summary: resumeData.summary || null,
        experience: (resumeData.experience || []).map((exp) => ({
          title: exp.position || '',
          company: exp.company || '',
          location: '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.description || (exp.achievements?.join('. ') ?? ''),
          current: exp.current || false,
        })),
        education: (resumeData.education || []).map((edu) => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || '',
          startYear: edu.startDate || '',
          endYear: edu.endDate || '',
        })),
        skills: resumeData.skills || [],
        certifications: (resumeData.certifications || []).map((c) => ({
          name: c.name,
          organization: c.issuer,
          date: c.date,
        })),
        volunteering: (resumeData.volunteering || []).map((v) => ({
          role: v.role,
          organization: v.organization,
          startDate: v.startDate,
          endDate: v.endDate,
          description: v.description,
        })),
        languages: (resumeData.languages || []).map((l) => ({
          language: l.language,
          proficiency: l.proficiency,
        })),
        projects: (resumeData.projects || []).map((p) => ({
          name: p.name,
          description: p.description,
          url: p.url,
        })),
      };

      setAccumulatedData(profileData);
      setParseState('preview');
      haptics.success();
    } catch (err) {
      clearInterval(stepInterval);
      console.error('PDF parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
      setParseState('method-select');
      haptics.error();
      toast.error('Failed to parse PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const removeExperienceEntry = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      experience: prev.experience?.filter((_, i) => i !== idx),
    }));
  };

  const updateExperienceEntry = (idx: number, field: 'title' | 'company' | 'startDate' | 'endDate', value: string) => {
    setAccumulatedData((prev) => ({
      ...prev,
      experience: prev.experience?.map((exp, i) => i === idx ? { ...exp, [field]: value } : exp),
    }));
  };

  const removeEducationEntry = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      education: prev.education?.filter((_, i) => i !== idx),
    }));
  };

  const removeSkill = (skill: string) => {
    setAccumulatedData((prev) => ({
      ...prev,
      skills: prev.skills?.filter((s) => s !== skill),
    }));
  };

  const removeLanguage = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      languages: prev.languages?.filter((_, i) => i !== idx),
    }));
  };

  const removeCertification = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      certifications: prev.certifications?.filter((_, i) => i !== idx),
    }));
  };

  const removeVolunteering = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      volunteering: prev.volunteering?.filter((_, i) => i !== idx),
    }));
  };

  const removeProject = (idx: number) => {
    setAccumulatedData((prev) => ({
      ...prev,
      projects: prev.projects?.filter((_, i) => i !== idx),
    }));
  };

  const handleImport = () => {
    const data = accumulatedData;
    if (!data || Object.keys(data).length === 0) {
      toast.error('No data to import');
      return;
    }

    setParseState('importing');
    haptics.light();

    const importData: Partial<ProfileData> = {};
    if (selectedSections.summary && data.summary) importData.summary = data.summary;
    if (selectedSections.experience && data.experience?.length) {
      let exp = data.experience;
      if (existingExperience && existingExperience.length > 0) {
        const before = exp.length;
        exp = exp.filter((e) =>
          !existingExperience.some(
            (existing) =>
              existing.company.toLowerCase().trim() === e.company.toLowerCase().trim() &&
              yearsOverlap(existing.startDate, existing.endDate, e.startDate, e.endDate),
          ),
        );
        const skipped = before - exp.length;
        if (skipped > 0) {
          toast.info(
            `${skipped} duplicate experience entr${skipped === 1 ? 'y' : 'ies'} skipped`,
          );
        }
      }
      if (exp.length) importData.experience = exp;
    }
    if (selectedSections.education && data.education?.length) importData.education = data.education;
    if (selectedSections.skills && data.skills?.length) importData.skills = data.skills;
    if (selectedSections.certifications && data.certifications?.length) importData.certifications = data.certifications;
    if (selectedSections.volunteering && data.volunteering?.length) importData.volunteering = data.volunteering;
    if (selectedSections.languages && data.languages?.length) importData.languages = data.languages;
    if (selectedSections.projects && data.projects?.length) importData.projects = data.projects;

    setTimeout(() => {
      onImport(importData);
      setParseState('done');
      haptics.success();
      toast.success('Profile data imported successfully!');
      setTimeout(() => {
        onOpenChange(false);
        handleFullReset();
      }, 1500);
    }, 500);
  };

  const handleFullReset = () => {
    setParseState('method-select');
    setAccumulatedData({});
    setQuickPasteText('');
    setStepText('');
    setStepResult(null);
    setActiveGuideStep(0);
    setError(null);
    setSelectedSections({
      summary: true,
      experience: true,
      education: true,
      skills: true,
      certifications: true,
      volunteering: true,
      languages: true,
      projects: true,
    });
  };

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const countSelected = () => {
    let count = 0;
    if (selectedSections.summary && accumulatedData?.summary) count++;
    if (selectedSections.experience && accumulatedData?.experience?.length) count++;
    if (selectedSections.education && accumulatedData?.education?.length) count++;
    if (selectedSections.skills && accumulatedData?.skills?.length) count++;
    if (selectedSections.certifications && accumulatedData?.certifications?.length) count++;
    if (selectedSections.volunteering && accumulatedData?.volunteering?.length) count++;
    if (selectedSections.languages && accumulatedData?.languages?.length) count++;
    if (selectedSections.projects && accumulatedData?.projects?.length) count++;
    return count;
  };

  const currentGuide = GUIDE_STEPS[activeGuideStep];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) handleFullReset();
      }}
    >
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
        <SheetHeader className="shrink-0">
          <div className="px-6 pt-6 pb-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Import Profile</SheetTitle>
                <SheetDescription>AI-powered profile extraction</SheetDescription>
              </div>
            </div>
            {/* Platform picker — shown before preview/done states */}
            {(parseState === 'method-select' || parseState === 'quick-paste') && (
              <div className="flex gap-1.5 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-all touch-manipulation',
                      platform === p.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <AnimatePresence mode="wait">
            {/* ── Method Selection ── */}
            {parseState === 'method-select' && (
              <motion.div
                key="method-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Choose how to import your {platformLabel} profile
                </p>

                {/* Quick Paste — primary */}
                <button
                  onClick={() => setParseState('quick-paste')}
                  className="w-full p-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:border-primary/70 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">Quick Paste</h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">Fastest</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paste your entire profile at once — AI extracts everything in one shot
                    </p>
                  </div>
                </button>

                {/* Smart Import — wizard */}
                <button
                  onClick={() => { setParseState('wizard'); setActiveGuideStep(0); }}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Wand2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">Smart Import</h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AI</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Step-by-step guided paste — AI organizes each section individually
                    </p>
                  </div>
                </button>

                {/* PDF Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Upload PDF</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upload the PDF exported from {platformLabel}
                    </p>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                    e.target.value = '';
                  }}
                />

                <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    How to copy your {platformLabel} profile
                  </p>
                  {platform === 'linkedin' && (
                    <p>Open your LinkedIn profile → press Ctrl+A (Cmd+A on Mac) → Copy → Paste here. Or: More button → "Save to PDF" for PDF upload.</p>
                  )}
                  {platform === 'indeed' && (
                    <p>Open your Indeed resume → press Ctrl+A → Copy → Paste here.</p>
                  )}
                  {platform === 'xing' && (
                    <p>Open your Xing profile → press Ctrl+A → Copy → Paste here. Or export PDF from profile settings.</p>
                  )}
                  {platform === 'wellfound' && (
                    <p>Open your Wellfound profile → press Ctrl+A → Copy → Paste here.</p>
                  )}
                  {platform === 'generic' && (
                    <p>Open your profile or resume → select all text → Copy → Paste here.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Quick Paste ── */}
            {parseState === 'quick-paste' && (
              <motion.div
                key="quick-paste"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="py-6 space-y-4"
              >
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">How to get your profile text</p>
                  <p>Open your {platformLabel} profile → Ctrl+A (Cmd+A) → Copy → Paste below</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Paste your full profile</label>
                    <button
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setQuickPasteText(text);
                          haptics.light();
                        } catch {
                          toast.error('Could not read clipboard');
                        }
                      }}
                      className="text-xs text-primary flex items-center gap-1 hover:underline touch-manipulation"
                    >
                      <Copy className="w-3 h-3" />
                      Paste from clipboard
                    </button>
                  </div>
                  <Textarea
                    placeholder={`Paste your entire ${platformLabel} profile text here — the more you paste, the better the results...`}
                    value={quickPasteText}
                    onChange={(e) => setQuickPasteText(e.target.value)}
                    className="min-h-[200px] resize-none text-sm"
                  />
                  {quickPasteText && (
                    <p className="text-xs text-muted-foreground">
                      {quickPasteText.length.toLocaleString()} characters pasted
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Quick Analyzing ── */}
            {parseState === 'quick-analyzing' && (
              <motion.div
                key="quick-analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-16 flex flex-col items-center justify-center space-y-6"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">Analyzing your profile</h3>
                  <p className="text-sm text-muted-foreground">
                    AI is extracting everything from your {platformLabel} data...
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Wizard — Step-by-step ── */}
            {parseState === 'wizard' && (
              <motion.div
                key={`wizard-${activeGuideStep}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="py-6 space-y-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Step {activeGuideStep + 1} of {GUIDE_STEPS.length}</span>
                    <span>{Math.round((activeGuideStep / GUIDE_STEPS.length) * 100)}% complete</span>
                  </div>
                  <div className="flex gap-1.5">
                    {GUIDE_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          i < activeGuideStep ? 'bg-primary' : i === activeGuideStep ? 'bg-primary/50' : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <currentGuide.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{currentGuide.title}</h3>
                      <p className="text-xs text-muted-foreground">{currentGuide.description}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted text-xs text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{currentGuide.tip}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Paste content</label>
                    <button
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setStepText(text);
                          haptics.light();
                        } catch {
                          toast.error('Could not read clipboard');
                        }
                      }}
                      className="text-xs text-primary flex items-center gap-1 hover:underline touch-manipulation"
                    >
                      <Copy className="w-3 h-3" />
                      Paste from clipboard
                    </button>
                  </div>
                  <Textarea
                    placeholder={currentGuide.placeholder}
                    value={stepText}
                    onChange={(e) => setStepText(e.target.value)}
                    className="min-h-[140px] resize-none"
                  />
                  {stepText && (
                    <p className="text-xs text-muted-foreground">{stepText.length.toLocaleString()} characters</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step Analyzing ── */}
            {parseState === 'step-analyzing' && (
              <motion.div
                key="step-analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-16 flex flex-col items-center justify-center space-y-6"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">Analyzing {currentGuide.title}</h3>
                  <p className="text-sm text-muted-foreground">AI is organizing your content...</p>
                </div>
              </motion.div>
            )}

            {/* ── Step Result ── */}
            {parseState === 'step-result' && stepResult && (
              <motion.div
                key="step-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-medium">{currentGuide.title} analyzed!</h3>
                    <p className="text-sm text-muted-foreground">Here's what AI found</p>
                  </div>
                </div>

                {stepResult.summary && (
                  <div className="p-4 rounded-xl border border-primary bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-4">{stepResult.summary}</p>
                  </div>
                )}

                {stepResult.experience && stepResult.experience.length > 0 && (
                  <div className="p-4 rounded-xl border border-primary bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Experience</span>
                      <Badge variant="secondary" className="text-xs">{stepResult.experience.length} positions</Badge>
                    </div>
                    <div className="space-y-1">
                      {stepResult.experience.slice(0, 3).map((exp, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{exp.title}</span> at {exp.company}
                        </div>
                      ))}
                      {stepResult.experience.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{stepResult.experience.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}

                {stepResult.education && stepResult.education.length > 0 && (
                  <div className="p-4 rounded-xl border border-primary bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Education</span>
                      <Badge variant="secondary" className="text-xs">{stepResult.education.length} entries</Badge>
                    </div>
                    <div className="space-y-1">
                      {stepResult.education.map((edu, i) => (
                        <div key={i} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{edu.degree}</span> at {edu.institution}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stepResult.skills && stepResult.skills.length > 0 && (
                  <div className="p-4 rounded-xl border border-primary bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Skills</span>
                      <Badge variant="secondary" className="text-xs">{stepResult.skills.length} skills</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {stepResult.skills.slice(0, 10).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                      {stepResult.skills.length > 10 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">+{stepResult.skills.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                )}

                {!stepResult.summary && !stepResult.experience?.length && !stepResult.education?.length && !stepResult.skills?.length && (
                  <div className="p-4 rounded-xl bg-muted text-center">
                    <p className="text-sm text-muted-foreground">No data found for this section. You can skip or try again.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PDF Parsing ── */}
            {parseState === 'parsing' && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-12 flex flex-col items-center justify-center space-y-8"
              >
                <motion.div
                  animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
                  transition={{
                    rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">AI is analyzing your profile</h3>
                  <p className="text-sm text-muted-foreground">This usually takes a few seconds...</p>
                </div>
                <div className="space-y-3 w-full max-w-xs">
                  {PARSING_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: index <= currentStep ? 1 : 0.4, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          isActive ? 'bg-primary/10' : isComplete ? 'bg-muted' : '',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          isComplete ? 'bg-success text-success-foreground' :
                          isActive ? 'bg-primary text-primary-foreground' :
                          'bg-muted text-muted-foreground',
                        )}>
                          {isComplete ? (
                            <Check className="w-4 h-4" />
                          ) : isActive ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                              <Sparkles className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <span className={cn('text-sm', isActive && 'font-medium')}>{step.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Editable Preview ── */}
            {parseState === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-medium">Ready to import!</h3>
                    <p className="text-sm text-muted-foreground">Select what to import — tap × to remove entries</p>
                  </div>
                </div>

                {accumulatedData.summary && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.summary ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.summary} onCheckedChange={() => toggleSection('summary')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Summary</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{accumulatedData.summary}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.experience && accumulatedData.experience.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.experience ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.experience} onCheckedChange={() => toggleSection('experience')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Experience</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.experience.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {accumulatedData.experience.map((exp, i) => (
                            <div key={i} className="rounded-lg border border-border/50 bg-background/50 p-2 space-y-1.5">
                              {editingExpIdx === i ? (
                                <div className="space-y-1.5">
                                  <Input
                                    value={exp.title}
                                    onChange={(e) => updateExperienceEntry(i, 'title', e.target.value)}
                                    placeholder="Job title"
                                    className="h-7 text-xs"
                                    aria-label="Job title"
                                  />
                                  <Input
                                    value={exp.company}
                                    onChange={(e) => updateExperienceEntry(i, 'company', e.target.value)}
                                    placeholder="Company"
                                    className="h-7 text-xs"
                                    aria-label="Company"
                                  />
                                  <div className="flex gap-1">
                                    <Input
                                      value={exp.startDate}
                                      onChange={(e) => updateExperienceEntry(i, 'startDate', e.target.value)}
                                      placeholder="Start date"
                                      className="h-7 text-xs flex-1"
                                      aria-label="Start date"
                                    />
                                    <Input
                                      value={exp.endDate}
                                      onChange={(e) => updateExperienceEntry(i, 'endDate', e.target.value)}
                                      placeholder="End date"
                                      className="h-7 text-xs flex-1"
                                      aria-label="End date"
                                      disabled={exp.current}
                                    />
                                  </div>
                                  <button
                                    onClick={() => setEditingExpIdx(null)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Done editing
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm text-foreground">{exp.title}</span>
                                    <span className="text-sm text-muted-foreground"> at {exp.company}</span>
                                    {exp.startDate && (
                                      <span className="text-xs text-muted-foreground/70 block">
                                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setEditingExpIdx(i)}
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
                                    aria-label="Edit entry"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => removeExperienceEntry(i)}
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                                    aria-label="Remove entry"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.education && accumulatedData.education.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.education ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.education} onCheckedChange={() => toggleSection('education')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Education</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.education.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {accumulatedData.education.map((edu, i) => (
                            <div key={i} className="flex items-start gap-2 group">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm text-foreground">{edu.degree}</span>
                                <span className="text-sm text-muted-foreground"> at {edu.institution}</span>
                                {edu.endYear && (
                                  <span className="text-xs text-muted-foreground/70 block">{edu.endYear}</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeEducationEntry(i)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                                aria-label="Remove entry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.skills && accumulatedData.skills.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.skills ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.skills} onCheckedChange={() => toggleSection('skills')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Skills</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.skills.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {accumulatedData.skills.map((skill, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-xs bg-background">
                              {skill}
                              <button
                                onClick={() => removeSkill(skill)}
                                className="w-3.5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                                aria-label={`Remove ${skill}`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.certifications && accumulatedData.certifications.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.certifications ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.certifications} onCheckedChange={() => toggleSection('certifications')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Certifications</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.certifications.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {accumulatedData.certifications.map((cert, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{cert.name}</span>
                                {cert.organization && <span> by {cert.organization}</span>}
                              </div>
                              <button
                                onClick={() => removeCertification(i)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                                aria-label="Remove entry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.projects && accumulatedData.projects.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.projects ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.projects} onCheckedChange={() => toggleSection('projects')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileBarChart className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Projects</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.projects.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {accumulatedData.projects.map((proj, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{proj.name}</span>
                              </div>
                              <button
                                onClick={() => removeProject(i)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                                aria-label="Remove entry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.languages && accumulatedData.languages.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.languages ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.languages} onCheckedChange={() => toggleSection('languages')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Languages</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.languages.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {accumulatedData.languages.map((l, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-xs bg-background">
                              {l.language}{l.proficiency ? `: ${l.proficiency}` : ''}
                              <button
                                onClick={() => removeLanguage(i)}
                                className="w-3.5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                                aria-label={`Remove ${l.language}`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {accumulatedData.volunteering && accumulatedData.volunteering.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className={cn('p-4 rounded-xl border transition-colors', selectedSections.volunteering ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.volunteering} onCheckedChange={() => toggleSection('volunteering')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">Volunteering</span>
                          <Badge variant="secondary" className="text-xs">{accumulatedData.volunteering.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {accumulatedData.volunteering.map((v, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{v.role}</span>
                                <span> at {v.organization}</span>
                              </div>
                              <button
                                onClick={() => removeVolunteering(i)}
                                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                                aria-label="Remove entry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!accumulatedData.summary &&
                  !accumulatedData.experience?.length &&
                  !accumulatedData.education?.length &&
                  !accumulatedData.skills?.length && (
                    <div className="p-6 rounded-xl bg-muted text-center space-y-2">
                      <p className="text-sm text-muted-foreground">No data was extracted. Try again with more content.</p>
                      <Button variant="outline" size="sm" onClick={handleFullReset}>
                        Start Over
                      </Button>
                    </div>
                  )}
              </motion.div>
            )}

            {/* ── Done ── */}
            {(parseState === 'importing' || parseState === 'done') && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16 flex flex-col items-center justify-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-success" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">
                    {parseState === 'importing' ? 'Importing...' : 'Import Complete!'}
                  </h3>
                  {parseState === 'done' && (
                    <p className="text-sm text-muted-foreground">Your profile data has been added</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-border bg-background shrink-0">
          {parseState === 'method-select' && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          )}

          {parseState === 'quick-paste' && (
            <>
              <Button variant="outline" onClick={handleFullReset} className="flex-1">
                Back
              </Button>
              <Button onClick={handleQuickAnalyze} disabled={!quickPasteText.trim()} className="flex-1 gap-2">
                <Sparkles className="w-4 h-4" />
                Analyze
              </Button>
            </>
          )}

          {parseState === 'wizard' && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  activeGuideStep === 0
                    ? handleFullReset()
                    : (() => { setActiveGuideStep((prev) => prev - 1); setStepText(''); setError(null); })()
                }
                className="flex-1"
              >
                {activeGuideStep === 0 ? 'Back' : 'Previous'}
              </Button>
              <Button variant="ghost" onClick={handleSkipStep} className="gap-1 text-muted-foreground">
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </Button>
              <Button onClick={handleStepAnalyze} disabled={!stepText.trim()} className="flex-1 gap-2">
                <Sparkles className="w-4 h-4" />
                Analyze
              </Button>
            </>
          )}

          {parseState === 'step-result' && (
            <>
              <Button
                variant="outline"
                onClick={() => { setParseState('wizard'); setStepResult(null); }}
                className="flex-1"
              >
                Re-paste
              </Button>
              <Button onClick={handleStepNext} className="flex-1 gap-2">
                {activeGuideStep < GUIDE_STEPS.length - 1 ? (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Review & Import <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </>
          )}

          {parseState === 'preview' && (
            <>
              <Button variant="outline" onClick={handleFullReset} className="flex-1">
                Start Over
              </Button>
              <Button onClick={handleImport} disabled={countSelected() === 0} className="flex-1 gap-2">
                Import {countSelected()} section{countSelected() !== 1 ? 's' : ''}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { ProfileImportSheetProps };

export { ProfileImportSheet as LinkedInImportSheet };
