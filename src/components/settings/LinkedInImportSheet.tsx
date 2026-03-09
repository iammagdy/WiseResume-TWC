import { useState, useRef } from 'react';
import { openExternal } from '@/lib/openExternal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Linkedin, 
  Sparkles, 
  Loader2, 
  Check, 
  Briefcase, 
  GraduationCap, 
  Lightbulb, 
  FileText,
  Copy,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Upload,
  ClipboardPaste,
  Link2,
  ArrowRight
} from 'lucide-react';
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

interface LinkedInData {
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
}

interface LinkedInImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: Partial<LinkedInData>) => void;
  linkedinUsername?: string;
}

type ParseState = 'method-select' | 'idle' | 'url-guide' | 'parsing' | 'preview' | 'importing' | 'done';

const PARSING_STEPS = [
  { id: 1, label: 'Reading profile data...', icon: FileText },
  { id: 2, label: 'Extracting experience...', icon: Briefcase },
  { id: 3, label: 'Analyzing skills...', icon: Lightbulb },
  { id: 4, label: 'Structuring education...', icon: GraduationCap },
];

export function LinkedInImportSheet({ 
  open, 
  onOpenChange, 
  onImport,
  linkedinUsername 
}: LinkedInImportSheetProps) {
  const [profileText, setProfileText] = useState('');
  const [parseState, setParseState] = useState<ParseState>('method-select');
  const [currentStep, setCurrentStep] = useState(0);
  const [parsedData, setParsedData] = useState<LinkedInData | null>(null);
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    experience: true,
    education: true,
    skills: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const handleParse = async () => {
    if (!profileText.trim()) {
      toast.error('Please paste your LinkedIn profile content');
      return;
    }

    const trimmedText = profileText.trim();
    const isJustUrl = /^https?:\/\/(www\.)?linkedin\.com/i.test(trimmedText) && 
                      trimmedText.split('\n').length <= 3 && 
                      trimmedText.length < 500;
    
    if (isJustUrl) {
      setError("It looks like you pasted a LinkedIn URL. Please go to your profile page, select all text (Ctrl/Cmd+A), copy it (Ctrl/Cmd+C), and paste the full content here.");
      toast.error('Please paste your profile content, not the URL');
      return;
    }

    setParseState('parsing');
    setError(null);
    setCurrentStep(0);
    haptics.light();

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => prev < PARSING_STEPS.length - 1 ? prev + 1 : prev);
    }, 800);

    try {
      const { data, error: fnError } = await edgeFunctions.functions.invoke('parse-linkedin', {
        body: { profileText: profileText.trim() },
      });

      clearInterval(stepInterval);

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setParsedData(data);
      setParseState('preview');
      haptics.success();
    } catch (err) {
      clearInterval(stepInterval);
      console.error('LinkedIn parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse profile');
      setParseState('idle');
      haptics.error();
      toast.error('Failed to parse LinkedIn profile');
    }
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
      setCurrentStep(prev => prev < PARSING_STEPS.length - 1 ? prev + 1 : prev);
    }, 800);

    try {
      // Use the existing client-side PDF extraction pipeline
      const parseResult = await parseResumePDF(file);
      
      let resumeData = parseResult.data;
      
      // If OCR is needed, try OCR extraction
      if (parseResult.needsOCR) {
        resumeData = await parseResumePDFWithOCR(file);
      }
      
      if (!resumeData) {
        throw new Error('Could not extract content from this PDF');
      }

      clearInterval(stepInterval);

      // Map ResumeData output to LinkedInData format
      const linkedInData: LinkedInData = {
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
      };

      setParsedData(linkedInData);
      setParseState('preview');
      haptics.success();
    } catch (err) {
      clearInterval(stepInterval);
      console.error('LinkedIn PDF parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse LinkedIn PDF');
      setParseState('method-select');
      haptics.error();
      toast.error('Failed to parse LinkedIn PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleUrlGuide = () => {
    const url = linkedinUrl.trim();
    if (!url) return;
    
    // Open the LinkedIn profile in a new tab
    openExternal(url);
    
    // Switch to paste state with the textarea auto-focused
    setParseState('idle');
    haptics.light();
  };

  const handleImport = () => {
    if (!parsedData) return;

    setParseState('importing');
    haptics.light();

    const importData: Partial<LinkedInData> = {};
    if (selectedSections.summary && parsedData.summary) importData.summary = parsedData.summary;
    if (selectedSections.experience && parsedData.experience?.length) importData.experience = parsedData.experience;
    if (selectedSections.education && parsedData.education?.length) importData.education = parsedData.education;
    if (selectedSections.skills && parsedData.skills?.length) importData.skills = parsedData.skills;

    setTimeout(() => {
      onImport(importData);
      setParseState('done');
      haptics.success();
      toast.success('LinkedIn data imported successfully!');
      
      setTimeout(() => {
        onOpenChange(false);
        setProfileText('');
        setParsedData(null);
        setParseState('method-select');
        setSelectedSections({ summary: true, experience: true, education: true, skills: true });
      }, 1500);
    }, 500);
  };

  const handleReset = () => {
    setParseState('method-select');
    setParsedData(null);
    setProfileText('');
    setLinkedinUrl('');
    setError(null);
  };

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const countSelected = () => {
    let count = 0;
    if (selectedSections.summary && parsedData?.summary) count++;
    if (selectedSections.experience && parsedData?.experience?.length) count++;
    if (selectedSections.education && parsedData?.education?.length) count++;
    if (selectedSections.skills && parsedData?.skills?.length) count++;
    return count;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        setParseState('method-select');
        setProfileText('');
        setParsedData(null);
        setError(null);
      }
    }}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <SheetHeader className="shrink-0">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <div>
                <SheetTitle>Import from LinkedIn</SheetTitle>
                <SheetDescription>
                  AI-powered profile extraction
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <AnimatePresence mode="wait">
            {/* Method Selection */}
            {parseState === 'method-select' && (
              <motion.div
                key="method-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-4"
              >
                <p className="text-sm text-muted-foreground">Choose how to import your LinkedIn profile</p>
                
                <button
                  onClick={() => setParseState('idle')}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardPaste className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Paste Profile Text</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Copy your LinkedIn page content and paste it here</p>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Upload LinkedIn PDF</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload the PDF exported from LinkedIn's "Save to PDF"</p>
                  </div>
                </button>

                <button
                  onClick={() => setParseState('url-guide')}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left flex items-start gap-4 touch-manipulation active:scale-[0.98] min-h-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Import via URL</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Paste your LinkedIn profile link — we'll guide you through it</p>
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

                <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">💡 Tip: Export LinkedIn PDF</p>
                  <p>Open LinkedIn → Your profile → "More" button → "Save to PDF"</p>
                </div>
              </motion.div>
            )}

            {/* URL Guide State */}
            {parseState === 'url-guide' && (
              <motion.div
                key="url-guide"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your LinkedIn profile URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/your-name"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="flex w-full rounded-xl glass-input px-3 py-2.5 text-[16px] ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>

                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h3 className="font-medium text-sm">Here's how it works</h3>
                  <ol className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <span>We'll <strong>open your profile</strong> in a new tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span><strong>Select all</strong> on the page (Ctrl/Cmd+A) and <strong>Copy</strong> (Ctrl/Cmd+C)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <span>Come back here and <strong>paste</strong> the content — AI will do the rest</span>
                    </li>
                  </ol>
                </div>
              </motion.div>
            )}

            {/* Paste State */}
            {parseState === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-6 space-y-6"
              >
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h3 className="font-medium text-sm">How it works</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <span>Open your LinkedIn profile in a browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span><strong>Select ALL content</strong> on the page (Ctrl/Cmd+A) and copy (Ctrl/Cmd+C)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <span>Paste the <strong>full text</strong> below (not just the URL!)</span>
                    </li>
                  </ol>
                  
                  {linkedinUsername ? (
                    <button onClick={() => openExternal(`https://linkedin.com/in/${linkedinUsername}`)} className="inline-flex items-center gap-2 text-sm text-primary hover:underline touch-manipulation">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Your LinkedIn Profile
                    </button>
                  ) : (
                    <button onClick={() => openExternal('https://linkedin.com')} className="inline-flex items-center gap-2 text-sm text-primary hover:underline touch-manipulation">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Go to LinkedIn
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Paste your profile content</label>
                    <button 
                      onClick={async () => {
                        const text = await navigator.clipboard.readText();
                        setProfileText(text);
                        haptics.light();
                      }}
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <Copy className="w-3 h-3" />
                      Paste from clipboard
                    </button>
                  </div>
                  <Textarea
                    placeholder="Paste your LinkedIn profile content here..."
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                  {profileText && (
                    <p className="text-xs text-muted-foreground">
                      {profileText.length.toLocaleString()} characters
                    </p>
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

            {/* Parsing State */}
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
                  transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
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
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary/10' : isComplete ? 'bg-muted/50' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete ? 'bg-success text-success-foreground' :
                          isActive ? 'bg-primary text-primary-foreground' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? (
                            <Check className="w-4 h-4" />
                          ) : isActive ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                              <Loader2 className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{step.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Preview State */}
            {parseState === 'preview' && parsedData && (
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
                    <h3 className="font-medium">Profile parsed successfully!</h3>
                    <p className="text-sm text-muted-foreground">Select what to import</p>
                  </div>
                </div>

                {parsedData.summary && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`p-4 rounded-xl border transition-colors ${selectedSections.summary ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.summary} onCheckedChange={() => toggleSection('summary')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Summary</span></div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{parsedData.summary}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {parsedData.experience?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className={`p-4 rounded-xl border transition-colors ${selectedSections.experience ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.experience} onCheckedChange={() => toggleSection('experience')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Experience</span><Badge variant="secondary" className="text-xs">{parsedData.experience.length} positions</Badge></div>
                        <div className="space-y-1">
                          {parsedData.experience.slice(0, 3).map((exp, i) => (
                            <div key={i} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{exp.title}</span><span> at {exp.company}</span></div>
                          ))}
                          {parsedData.experience.length > 3 && <p className="text-xs text-muted-foreground">+{parsedData.experience.length - 3} more</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {parsedData.education?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className={`p-4 rounded-xl border transition-colors ${selectedSections.education ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.education} onCheckedChange={() => toggleSection('education')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Education</span><Badge variant="secondary" className="text-xs">{parsedData.education.length} entries</Badge></div>
                        <div className="space-y-1">
                          {parsedData.education.slice(0, 2).map((edu, i) => (
                            <div key={i} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{edu.degree}</span><span> at {edu.institution}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {parsedData.skills?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className={`p-4 rounded-xl border transition-colors ${selectedSections.skills ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedSections.skills} onCheckedChange={() => toggleSection('skills')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Skills</span><Badge variant="secondary" className="text-xs">{parsedData.skills.length} skills</Badge></div>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedData.skills.slice(0, 8).map((skill, i) => <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>)}
                          {parsedData.skills.length > 8 && <Badge variant="outline" className="text-xs text-muted-foreground">+{parsedData.skills.length - 8} more</Badge>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Done State */}
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
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-success" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{parseState === 'importing' ? 'Importing...' : 'Import Complete!'}</h3>
                  <p className="text-sm text-muted-foreground">{parseState === 'done' && 'Your LinkedIn data has been added'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-border bg-background">
          {parseState === 'method-select' && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          )}

          {parseState === 'url-guide' && (
            <>
              <Button variant="outline" onClick={handleReset} className="flex-1">Back</Button>
              <Button 
                onClick={handleUrlGuide} 
                disabled={!linkedinUrl.trim() || !/linkedin\.com/i.test(linkedinUrl)} 
                className="flex-1 gap-2"
              >
                Open & Copy
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {parseState === 'idle' && (
            <>
              <Button variant="outline" onClick={handleReset} className="flex-1">Back</Button>
              <Button onClick={handleParse} disabled={!profileText.trim()} className="flex-1 gap-2">
                <Sparkles className="w-4 h-4" />
                Extract with AI
              </Button>
            </>
          )}

          {parseState === 'preview' && (
            <>
              <Button variant="outline" onClick={handleReset} className="flex-1">Start Over</Button>
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
