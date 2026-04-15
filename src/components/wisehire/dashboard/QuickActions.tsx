import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, BarChart2, Users, ShieldCheck, Building2 } from 'lucide-react';

const ACTIONS = [
  {
    label: 'Generate Brief',
    description: 'Upload a CV and get an AI candidate brief',
    icon: Sparkles,
    path: '/wisehire/brief',
    color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  {
    label: 'Write a JD',
    description: 'Generate a polished job description with AI',
    icon: FileText,
    path: '/wisehire/jd-writer',
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
  {
    label: 'View Pipeline',
    description: 'Manage your candidate Kanban board',
    icon: BarChart2,
    path: '/wisehire/pipeline',
    color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  },
  {
    label: 'Talent Pool',
    description: 'Browse opt-in candidates for sourcing',
    icon: Users,
    path: '/wisehire/talent-pool',
    color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  },
  {
    label: 'Mask CVs',
    description: 'Anonymise CVs for bias-free review',
    icon: ShieldCheck,
    path: '/wisehire/mask-cvs',
    color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  },
  {
    label: 'Clients',
    description: 'Manage companies you recruit for',
    icon: Building2,
    path: '/wisehire/clients',
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="group flex items-start gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all duration-150"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {action.label}
                </p>
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
