import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { databases, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useAuth } from '@/hooks/useAuth';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle2,
  Loader2,
  KeyRound,
  Briefcase,
} from 'lucide-react';

const DRAFT_KEY = 'wisehire_onboarding_draft';
const TOTAL_STEPS = 5;

interface OnboardingDraft {
  step: number;
  name: string;
  size: string;
  roleTypes: string[];
  monthlyVolume: string;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  step: 1,
  name: '',
  size: '',
  roleTypes: [],
  monthlyVolume: '',
};

const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '501-1000', label: '501–1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

const ROLE_TYPES = [
  'Engineering', 'Design', 'Product', 'Marketing',
  'Sales', 'Operations', 'Finance', 'HR', 'Legal', 'Other',
];

const MONTHLY_VOLUMES = [
  { value: '<5', label: 'Less than 5 hires' },
  { value: '5-10', label: '5–10 hires' },
  { value: '10-20', label: '10–20 hires' },
  { value: '20-50', label: '20–50 hires' },
  { value: '50+', label: '50+ hires' },
];

function loadDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    return { ...DEFAULT_DRAFT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function saveDraft(draft: OnboardingDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage might be unavailable
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export default function WiseHireOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { data: account } = useWiseHireAccount();

  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const saved = loadDraft();
    // Pre-fill company name from sign-up data if empty
    const signupCompany = sessionStorage.getItem('wh_company_name') ?? '';
    const signupSize = sessionStorage.getItem('wh_company_size') ?? '';
    return {
      ...saved,
      name: saved.name || signupCompany || (account?.company?.name ?? ''),
      size: saved.size || signupSize || (account?.company?.size ?? ''),
    };
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const step = draft.step;

  const update = useCallback((changes: Partial<OnboardingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...changes };
      saveDraft(next);
      return next;
    });
  }, []);

  // Keep draft in sync with account data on first load
  useEffect(() => {
    if (!account?.company) return;
    setDraft((prev) => {
      const next = {
        ...prev,
        name: prev.name || account.company!.name || '',
        size: prev.size || account.company!.size || '',
      };
      saveDraft(next);
      return next;
    });
  }, [account]);

  function goNext() {
    if (step < TOTAL_STEPS) update({ step: step + 1 });
  }

  function goBack() {
    if (step > 1) update({ step: step - 1 });
  }

  function handleSkip() {
    navigate('/wisehire/dashboard', { replace: true });
  }

  async function handleComplete() {
    if (!userId) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      // Upsert wisehire_companies: list first, then update or create
      const companyData = {
        owner_id: userId,
        name: draft.name.trim() || 'My Company',
        size: draft.size || '1-10',
        role_types: draft.roleTypes.length > 0 ? draft.roleTypes : null,
        monthly_volume: draft.monthlyVolume || null,
        onboarding_completed: true,
      };

      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.wisehire_companies, [
        Query.equal('owner_id', userId!),
        Query.limit(1),
      ]);

      if (existing.total > 0) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.wisehire_companies, existing.documents[0].$id, companyData);
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.wisehire_companies, ID.unique(), companyData);
      }

      // Mark profile onboarding complete
      try {
        const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('user_id', userId!),
          Query.limit(1),
        ]);
        if (profileRes.total > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.profiles, profileRes.documents[0].$id, { onboarding_completed: true });
        }
      } catch (profileErr) {
        console.warn('[WiseHireOnboarding] profile update failed:', profileErr instanceof Error ? profileErr.message : profileErr);
      }

      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['wisehire-account', userId] });
      navigate('/wisehire/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const isOnStarter = account?.currentPlan === 'wisehire_starter';

  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex flex-col items-center justify-start pt-12 pb-16 px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <span className="text-xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
          WiseHire
        </span>
        <p className="text-xs text-slate-400 mt-0.5">by thewise.cloud</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'w-6 bg-blue-600'
                : i + 1 < step
                ? 'w-2 bg-blue-400'
                : 'w-2 bg-slate-300 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        {step === 1 && <StepWelcome onNext={goNext} onSkip={handleSkip} draft={draft} />}
        {step === 2 && <StepCompanyIdentity draft={draft} update={update} onNext={goNext} onBack={goBack} onSkip={handleSkip} />}
        {step === 3 && <StepHiringContext draft={draft} update={update} onNext={goNext} onBack={goBack} onSkip={handleSkip} />}
        {step === 4 && <StepAISetup isStarter={isOnStarter} onNext={goNext} onBack={goBack} onSkip={handleSkip} />}
        {step === 5 && (
          <StepReady
            draft={draft}
            submitting={submitting}
            submitError={submitError}
            onComplete={handleComplete}
            onBack={goBack}
          />
        )}
      </div>

      {/* Step counter */}
      <p className="mt-4 text-xs text-slate-400">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

// ── Step 1: Welcome ──────────────────────────────────────────────

function StepWelcome({
  onNext, onSkip, draft,
}: { onNext: () => void; onSkip: () => void; draft: OnboardingDraft }) {
  const companyName = draft.name || 'your company';

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
        <Building2 className="h-8 w-8 text-blue-700 dark:text-blue-400" />
      </div>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Welcome to WiseHire
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Let's get {companyName} set up. This takes about 2 minutes and helps us tailor the
          platform to your hiring workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full text-left mt-2">
        {[
          { icon: <Building2 className="h-4 w-4 text-blue-500" />, text: 'Set up your company profile' },
          { icon: <Briefcase className="h-4 w-4 text-blue-500" />, text: 'Tell us about your hiring needs' },
          { icon: <Zap className="h-4 w-4 text-blue-500" />, text: 'Configure your AI preferences' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
            {item.icon}
            {item.text}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 w-full mt-2">
        <Button
          onClick={onNext}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold"
        >
          Let's get started
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          Skip setup for now
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Company Identity ─────────────────────────────────────

function StepCompanyIdentity({
  draft, update, onNext, onBack, onSkip,
}: {
  draft: OnboardingDraft;
  update: (changes: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          Company identity
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tell us a bit about your organisation.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            placeholder="Acme Corp"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companySize">Team size</Label>
          <Select value={draft.size} onValueChange={(v) => update({ size: v })}>
            <SelectTrigger id="companySize">
              <SelectValue placeholder="Select team size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        onSkip={onSkip}
        nextDisabled={!draft.name.trim() || !draft.size}
      />
    </div>
  );
}

// ── Step 3: Hiring Context ───────────────────────────────────────

function StepHiringContext({
  draft, update, onNext, onBack, onSkip,
}: {
  draft: OnboardingDraft;
  update: (changes: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  function toggleRole(role: string) {
    const updated = draft.roleTypes.includes(role)
      ? draft.roleTypes.filter((r) => r !== role)
      : [...draft.roleTypes, role];
    update({ roleTypes: updated });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          Hiring context
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          What kinds of roles do you hire for, and how many per month?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Role types you typically hire for</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_TYPES.map((role) => (
              <label
                key={role}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none"
              >
                <Checkbox
                  checked={draft.roleTypes.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                  className="shrink-0"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{role}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monthlyVolume">Monthly hiring volume</Label>
          <Select value={draft.monthlyVolume} onValueChange={(v) => update({ monthlyVolume: v })}>
            <SelectTrigger id="monthlyVolume">
              <SelectValue placeholder="Select approximate volume" />
            </SelectTrigger>
            <SelectContent>
              {MONTHLY_VOLUMES.map((v) => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} onSkip={onSkip} />
    </div>
  );
}

// ── Step 4: AI Setup ─────────────────────────────────────────────

function StepAISetup({
  isStarter, onNext, onBack, onSkip,
}: { isStarter: boolean; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          AI setup
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          WiseHire uses AI to generate candidate briefs, write JDs, and score applicants.
        </p>
      </div>

      {isStarter ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm mb-1">
              <KeyRound className="h-4 w-4" />
              Bring Your Own AI Key
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
              Your Starter plan uses your own OpenAI or Anthropic API key. Add your key in Settings
              to unlock AI features.
            </p>
          </div>
          <Link to="/wisehire/settings">
            <Button variant="outline" size="sm" className="w-full">
              <KeyRound className="h-4 w-4 mr-2" />
              Add AI key in Settings
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
              AI is ready to go
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
              Your Professional trial includes WiseHire's AI — no key required. Generate briefs,
              write JDs, and screen candidates right away.
            </p>
          </div>
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} onSkip={onSkip} nextLabel="Continue" />
    </div>
  );
}

// ── Step 5: Ready ────────────────────────────────────────────────

function StepReady({
  draft, submitting, submitError, onComplete, onBack,
}: {
  draft: OnboardingDraft;
  submitting: boolean;
  submitError: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          You're all set!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong className="text-slate-700 dark:text-slate-300">{draft.name || 'Your company'}</strong> is
          ready on WiseHire. Head to your dashboard to create your first role or generate a candidate brief.
        </p>
      </div>

      {/* Summary */}
      <div className="w-full text-left rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 space-y-1.5">
        <SummaryRow label="Company" value={draft.name || '—'} />
        <SummaryRow label="Team size" value={draft.size || '—'} />
        {draft.roleTypes.length > 0 && (
          <SummaryRow label="Hiring for" value={draft.roleTypes.slice(0, 4).join(', ') + (draft.roleTypes.length > 4 ? '…' : '')} />
        )}
        {draft.monthlyVolume && (
          <SummaryRow label="Monthly volume" value={MONTHLY_VOLUMES.find(v => v.value === draft.monthlyVolume)?.label ?? draft.monthlyVolume} />
        )}
      </div>

      {submitError && (
        <p className="text-xs text-red-600 dark:text-red-400 w-full text-left">{submitError}</p>
      )}

      <div className="flex gap-3 w-full mt-2">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-none">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onComplete}
          disabled={submitting}
          className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Go to Dashboard
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Shared components ────────────────────────────────────────────

function StepNav({
  onBack, onNext, onSkip, nextDisabled = false, nextLabel = 'Next',
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold"
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-center">
        Skip for now
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-700 dark:text-slate-300 font-medium text-right truncate">{value}</span>
    </div>
  );
}
