import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/useAuth';
import { useResumes, dbToResumeData } from '@/hooks/useResumes';
import { useResignationLetterMutations } from '@/hooks/useResignationLetters';
import { supabase } from '@/integrations/supabase/safeClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
import { haptics } from '@/lib/haptics';
import { useBackNavigation } from '@/hooks/useBackNavigation';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const REASONS = [
  { value: 'new_opportunity', label: 'New Opportunity' },
  { value: 'career_growth', label: 'Career Growth' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'personal_reasons', label: 'Personal Reasons' },
  { value: 'back_to_school', label: 'Going Back to School' },
  { value: 'health_reasons', label: 'Health Reasons' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const NOTICE_PERIODS = [
  { value: '2_weeks', label: '2 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: 'immediate', label: 'Immediate' },
];

const TEMPLATES = [
  { value: 'standard', label: 'Standard', desc: 'Traditional, formal' },
  { value: 'short', label: 'Short & Simple', desc: 'Brief, direct' },
  { value: 'grateful', label: 'Grateful', desc: 'Emphasize gratitude' },
  { value: 'career_growth', label: 'Career Growth', desc: 'New opportunity focus' },
  { value: 'immediate', label: 'Immediate', desc: 'Emergency situations' },
  { value: 'retirement', label: 'Retirement', desc: 'End of career' },
];

const ADDITIONS = [
  { id: 'transition_assistance', label: 'Offer transition assistance' },
  { id: 'express_gratitude', label: 'Express gratitude' },
  { id: 'positive_experiences', label: 'Mention positive experiences' },
  { id: 'train_replacement', label: 'Offer to train replacement' },
  { id: 'request_reference', label: 'Request reference letter' },
  { id: 'include_contact', label: 'Include contact information' },
];

const TONE_LABELS = ['Formal', 'Balanced', 'Friendly'];
const TONE_VALUES = ['formal', 'balanced', 'friendly'];

export default function ResignationLetterNewPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: resumes } = useResumes();
  const { saveLetter } = useResignationLetterMutations();
  const goBack = useBackNavigation();

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  // Step 1: Basic Info
  const [userName, setUserName] = useState('');
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState<Date | undefined>();
  const [noticePeriod, setNoticePeriod] = useState('2_weeks');
  const [reason, setReason] = useState('new_opportunity');

  // Step 2: Tone + Template
  const [toneIndex, setToneIndex] = useState(1); // balanced
  const [templateStyle, setTemplateStyle] = useState('standard');

  // Step 3: Additions
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>(['express_gratitude']);

  // Auto-fill from first resume
  useState(() => {
    if (resumes && resumes.length > 0) {
      const resume = dbToResumeData(resumes[0]);
      if (resume.contactInfo?.fullName) setUserName(resume.contactInfo.fullName);
    }
  });

  // Auth guard handled by ProtectedRoute

  const toggleAddition = (id: string) => {
    haptics.selection();
    setSelectedAdditions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!company.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setGenerating(true);
    haptics.light();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-resignation-letter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            recipientName,
            company,
            position,
            lastWorkingDay: lastWorkingDay ? format(lastWorkingDay, 'MMMM d, yyyy') : undefined,
            noticePeriod,
            reason,
            tone: TONE_VALUES[toneIndex],
            templateStyle,
            additions: selectedAdditions.map(id => ADDITIONS.find(a => a.id === id)?.label || id),
            userName,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'AI service error' }));
        throw new Error(err.error || 'Failed to generate letter');
      }

      const data = await response.json();
      setResult(data.letter);
      setStep(3);
      haptics.success();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result.trim()) return;
    haptics.light();
    saveLetter.mutate(
      {
        title: `${company} Resignation`,
        recipient_name: recipientName || undefined,
        company: company || undefined,
        position: position || undefined,
        last_working_day: lastWorkingDay ? format(lastWorkingDay, 'yyyy-MM-dd') : undefined,
        notice_period: noticePeriod,
        reason,
        tone: TONE_VALUES[toneIndex],
        template_style: templateStyle,
        additions: selectedAdditions,
        content: result,
      },
      {
        onSuccess: (data) => {
          navigate(`/resignation-letter/edit/${data.id}`, { replace: true });
        },
      }
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    haptics.light();
    toast.success('Copied to clipboard');
  };

  const steps = ['Info', 'Style', 'Options', 'Result'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="sticky top-0 z-10 glass-header px-4 py-3 space-y-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : goBack()}
            className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">New Resignation Letter</h1>
        </div>
        <Breadcrumb items={['AI Tools', 'Resignation Letters', 'New']} className="pl-10" />
      </header>

      {/* Step Indicator */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {steps.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 pt-2 pb-32 space-y-5">
          {/* Step 1: Basic Info */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name</label>
                <Input placeholder="John Doe" value={userName} onChange={(e) => setUserName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Position *</label>
                <Input placeholder="Software Engineer" value={position} onChange={(e) => setPosition(e.target.value)} autoComplete="organization-title" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name *</label>
                <Input placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Manager's Name</label>
                <Input placeholder="Jane Smith" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoComplete="off" autoCapitalize="words" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Working Day</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-12 px-4 rounded-xl glass-input text-left text-[16px] touch-manipulation">
                      {lastWorkingDay ? format(lastWorkingDay, 'PPP') : 'Select date...'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar mode="single" selected={lastWorkingDay} onSelect={setLastWorkingDay} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Notice Period</label>
                  <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NOTICE_PERIODS.map(np => (
                        <SelectItem key={np.value} value={np.value}>{np.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Tone + Template */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Tone</label>
                <div className="flex rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden">
                  {TONE_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => { haptics.selection(); setToneIndex(i); }}
                      className={cn(
                        'flex-1 py-3 text-sm font-semibold transition-all touch-manipulation',
                        toneIndex === i
                          ? 'bg-primary/20 text-primary shadow-[inset_0_0_20px_hsl(var(--primary)/0.1)]'
                          : 'text-muted-foreground hover:text-foreground',
                        i < TONE_LABELS.length - 1 && 'border-r border-border/30'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Template Style</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TEMPLATES.map(t => (
                    <motion.button
                      key={t.value}
                      whileTap={{ scale: 0.97 }}
                      style={{ touchAction: 'pan-y' }}
                      onClick={() => { haptics.selection(); setTemplateStyle(t.value); }}
                      className={cn(
                        'flex flex-col p-3.5 rounded-xl border-2 transition-all touch-manipulation text-left',
                        templateStyle === t.value
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border/40 bg-card/60'
                      )}
                    >
                      <span className={cn('text-sm font-bold', templateStyle === t.value ? 'text-primary' : 'text-foreground')}>
                        {t.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Optional Additions */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <label className="text-sm font-semibold text-foreground">Optional Additions</label>
              <p className="text-xs text-muted-foreground">Select elements to include in your letter</p>
              <div className="space-y-2">
                {ADDITIONS.map(a => (
                  <motion.button
                    key={a.id}
                    whileTap={{ scale: 0.97 }}
                    style={{ touchAction: 'pan-y' }}
                    onClick={() => toggleAddition(a.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all touch-manipulation text-left active:scale-95',
                      selectedAdditions.includes(a.id)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/40 bg-card/60'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                      selectedAdditions.includes(a.id)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    )}>
                      {selectedAdditions.includes(a.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4: Result */}
          {step === 3 && result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-elevated rounded-2xl p-5">
                <Textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="min-h-[50vh] text-[15px] leading-relaxed border-none bg-transparent p-0 focus-visible:ring-0"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-safe">
        <div className="glass-header rounded-2xl p-3 flex gap-2">
          {step < 2 && (
            <Button
              className="flex-1 gap-2 h-12 rounded-xl"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !company.trim()}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === 2 && (
            <Button
              className="flex-1 gap-2 h-12 rounded-xl"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {generating ? 'Generating...' : 'Generate Letter'}
            </Button>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" className="flex-1 h-12" onClick={handleCopy}>
                Copy
              </Button>
              <Button className="flex-1 h-12 gap-2" onClick={handleSave} disabled={saveLetter.isPending}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
