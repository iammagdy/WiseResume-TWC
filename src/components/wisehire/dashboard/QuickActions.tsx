import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

const ACTIONS = [
  {
    label: 'Generate Brief',
    description: 'Upload a CV and get an AI candidate brief',
    icon: Sparkles,
    path: '/wisehire/brief',
    color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    comingSoon: true,
  },
  {
    label: 'Write a JD',
    description: 'Generate a polished job description with AI',
    icon: FileText,
    path: '/wisehire/jd-writer',
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    comingSoon: true,
  },
  {
    label: 'View Pipeline',
    description: 'Manage your candidate Kanban board',
    icon: BarChart2,
    path: '/wisehire/pipeline',
    color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    comingSoon: true,
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  function handleClick(action: (typeof ACTIONS)[number]) {
    if (action.comingSoon) {
      toast.info(`${action.label} is coming in the next release.`);
      return;
    }
    navigate(action.path);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => handleClick(action)}
              className="group relative flex items-start gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all duration-150"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {action.label}
                  </p>
                  {action.comingSoon && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
