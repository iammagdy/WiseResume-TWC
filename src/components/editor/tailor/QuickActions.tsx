import { useState } from 'react';
import { Plus, ArrowUpDown, Hash } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { useAIAction } from '@/hooks/useAIAction';
import { showErrorToast } from '@/lib/errorToast';
import { toast } from 'sonner';
import editorLogger from '@/lib/editorLogger';
import { parseAIErrorBody, aiErrorToastMessage, AIError } from '@/lib/aiErrorParser';
import { ResumeData, SuperTailorResult } from '@/types/resume';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import {
  resumeSectionAiFnName,
  resumeSectionAiBodyProps,
} from '@/lib/resumeSectionAiFlag';
import { useRedactedResume } from '@/hooks/useRedactedResume';


interface QuickActionsProps {
  resume: ResumeData;
  tailorResult: SuperTailorResult;
  jobDescription: string;
  onUpdateResult: (updated: Partial<SuperTailorResult>) => void;
}

type ActionId = 'projects' | 'reorder' | 'quantify';

const ACTIONS: { id: ActionId; icon: typeof Plus; label: string; description: string }[] = [
  { id: 'projects', icon: Plus, label: 'Add Projects', description: 'Suggest relevant side projects' },
  { id: 'reorder', icon: ArrowUpDown, label: 'Reorder Sections', description: 'AI-optimized section order' },
  { id: 'quantify', icon: Hash, label: 'Quantify More', description: 'Add metrics to weak bullets' },
];

export function QuickActions({ resume, tailorResult, jobDescription, onUpdateResult }: QuickActionsProps) {
  const [loading, setLoading] = useState<ActionId | null>(null);
  const [completed, setCompleted] = useState<ActionId[]>([]);
  const { execute: executeAI } = useAIAction({ operation: 'enhance' });
  const redactedResume = useRedactedResume(resume);

  const handleAction = async (actionId: ActionId) => {
    setLoading(actionId);

    try {
      let instruction = '';
      let section: 'experience' | 'projects' | 'custom' = 'custom';
      let currentContent: unknown = [];

      switch (actionId) {
        case 'quantify':
          section = 'experience';
          currentContent = tailorResult.experience;
          instruction = 'Strengthen outcome language in these experience entries. Preserve every role, company, date, ID, and source fact. Never invent a number or metric; if evidence is missing, keep the factual wording unchanged.';
          break;
        case 'projects':
          section = 'projects';
          currentContent = tailorResult.projects ?? [];
          instruction = 'Suggest up to three realistic project ideas the candidate could build for this role, grounded only in their demonstrated skills. These are future project recommendations, not claims of completed work.';
          break;
        case 'reorder':
          section = 'custom';
          currentContent = ['summary', 'experience', 'education', 'skills', 'certifications'];
          instruction = 'Reorder only these existing resume section names for the target role. Do not add or remove sections.';
          break;
      }

      const result = await executeAI(async () => {
        const { data, error: invokeError } = await appwriteFunctions.invoke<Record<string, unknown>>(
          resumeSectionAiFnName('enhance-section'),
          {
            body: {
              ...resumeSectionAiBodyProps('enhance-section'),
              section,
              action: 'custom',
              currentContent,
              fixInstruction: instruction,
              context: { resume: redactedResume, jobDescription },
            },
          },
        );
        if (invokeError) {
          throw new AIError({ code: 'internal', status: invokeError.status ?? 500, message: invokeError.message });
        }
        if (data?.error) {
          throw new AIError(parseAIErrorBody(data, 200));
        }
        return data;
      });

      if (!result) {
        setLoading(null);
        return;
      }

      const improved = result?.improved;
      if (actionId === 'quantify' && Array.isArray(improved)) {
        onUpdateResult({ experience: improved as SuperTailorResult['experience'] });
        toast.success('Outcome wording strengthened without inventing metrics.');
      } else if (actionId === 'projects' && Array.isArray(improved)) {
        const projectNames = improved
          .map((project) => typeof project === 'object' && project !== null && 'name' in project
            ? String(project.name)
            : '')
          .filter(Boolean);
        toast.success(`${projectNames.length} project ideas generated for review.`, {
          description: projectNames.join(', '),
          duration: 6000,
        });
      } else if (actionId === 'reorder' && Array.isArray(improved)) {
        toast.success('Section order optimized!', {
          description: improved.filter((item): item is string => typeof item === 'string').join(' → '),
          duration: 6000,
        });
      } else {
        toast.success('Action completed!');
      }

      setCompleted(prev => [...prev, actionId]);
    } catch (err) {
      editorLogger.error('Quick action error:', err);
      if (err instanceof AIError) {
        toast.error(aiErrorToastMessage({ code: err.code, message: err.message, status: err.status }));
      } else {
        const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
        showErrorToast(msg, err);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <h4 className="font-semibold text-sm">⚡ Quick Actions</h4>
      <div className="grid gap-2">
        {ACTIONS.map(({ id, icon: Icon, label, description }) => {
          const isDone = completed.includes(id);
          const isLoading = loading === id;
          
          return (
            <Button
              key={id}
              variant="outline"
              size="sm"
              className="w-full justify-start h-auto py-2.5 px-3"
              disabled={isLoading || isDone}
              onClick={() => handleAction(id)}
            >
              {isLoading ? (
                <MiniSpinner size={16} className="mr-2 shrink-0" />
              ) : (
                <Icon className="w-4 h-4 mr-2 shrink-0" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium">{isDone ? `✓ ${label}` : label}</div>
                <div className="text-[11px] text-muted-foreground">{description}</div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
