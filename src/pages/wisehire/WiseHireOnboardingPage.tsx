import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function WiseHireOnboardingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Welcome to WiseHire!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Your account is set up. Full onboarding is coming soon.
        </p>
        <Link to="/wisehire/dashboard">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
