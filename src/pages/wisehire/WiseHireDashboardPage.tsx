import { Building2 } from 'lucide-react';

export default function WiseHireDashboardPage() {
  return (
    <div className="min-h-[100dvh] bg-[#f0f5ff] dark:bg-[#00061a] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 mx-auto mb-4">
          <Building2 className="h-8 w-8 text-blue-700 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          WiseHire Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Coming soon — your hiring command centre is being built.
        </p>
      </div>
    </div>
  );
}
