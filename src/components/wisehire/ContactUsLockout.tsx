import { Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Full-screen lockout shown when an HR user's trial has expired
 * and they have no active WiseHire plan.
 */
export function ContactUsLockout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 mx-auto mb-6">
          <Lock className="h-8 w-8 text-slate-500 dark:text-slate-400" />
        </div>

        {/* Brand */}
        <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2 tracking-wide uppercase">
          WiseHire
        </p>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Your trial has ended
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Thank you for trying WiseHire. To continue using the platform, please reach out to us — we'll
          get your account set up with the right plan for your team.
        </p>

        {/* Primary CTA */}
        <a href="mailto:contact@thewise.cloud?subject=WiseHire%20Access%20Request">
          <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold mb-3">
            <Mail className="h-4 w-4 mr-2" />
            Contact us to continue
          </Button>
        </a>

        {/* Subscription page link */}
        <Link to="/wisehire/subscription">
          <Button variant="outline" className="w-full mb-6">
            View plans
          </Button>
        </Link>

        <button
          onClick={() => signOut()}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
