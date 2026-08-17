import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { Button } from '@/components/ui/button';
import { useWiseHireAccount } from '@/hooks/wisehire/useWiseHireAccount';

const AVAILABLE_WORKFLOWS = [
  'Role, candidate, pipeline, and talent-pool organization',
  'AI-assisted candidate briefs and job-description drafts for human review',
  'Bulk evidence review and assisted CV de-identification',
  'Scorecards, outreach drafts, and hiring-workflow analytics',
];

function planLabel(plan: string) {
  if (!plan || plan === 'free') return 'No active WiseHire entitlement';
  return plan.replace(/^wisehire_/, '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WiseHireSubscriptionPage() {
  const { data: account, isLoading } = useWiseHireAccount();

  return (
    <WiseHireShell>
      <div className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/wisehire/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <div className="text-center mb-8">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
              WiseHire Early Access
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Access and plan
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              WiseHire is currently invitation-based. Public self-service pricing and fixed plan
              limits are not published yet; your access terms are confirmed directly with our team.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-5">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Current access</h2>
            {isLoading ? (
              <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" aria-label="Loading current access" />
            ) : account?.isTrialActive ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">7-day Professional trial</p>
                  <p className="text-sm text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                    {account.daysRemaining === 0
                      ? 'Your trial expires today.'
                      : `${account.daysRemaining} day${account.daysRemaining === 1 ? '' : 's'} remaining.`}
                  </p>
                </div>
              </div>
            ) : account && !account.isExpiredWithNoPlan ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Active WiseHire access</p>
                  <p className="text-sm text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                    Plan recorded on your account: {planLabel(account.currentPlan)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-300">No active WiseHire access</p>
                  <p className="text-sm text-red-700/90 dark:text-red-300/80 mt-0.5">
                    Contact us to review renewal or early-access options for your team.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Current workspace</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              These workflows are present in the early-access product. AI actions depend on the
              configured provider and require human review; usage, support, and commercial terms
              depend on your written access agreement.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 mb-6">
              {AVAILABLE_WORKFLOWS.map((workflow) => (
                <li key={workflow} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  {workflow}
                </li>
              ))}
            </ul>
            <a href="mailto:contact@thewise.cloud?subject=WiseHire%20Access%20and%20Plan%20Enquiry">
              <Button className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white">
                <Mail className="h-4 w-4 mr-2" />
                Ask about access terms
              </Button>
            </a>
            <p className="text-xs text-slate-400 mt-3">
              Generic WiseResume coupon codes do not activate WiseHire plans.
            </p>
          </section>
        </div>
      </div>
    </WiseHireShell>
  );
}
