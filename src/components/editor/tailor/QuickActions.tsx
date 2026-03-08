import { useState } from 'react';
import { Plus, ArrowUpDown, Hash } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Button } from '@/components/ui/button';
import { getSupabaseToken } from '@/lib/supabaseAuth';
import { useAIAction } from '@/hooks/useAIAction';
import { showErrorToast } from '@/lib/errorToast';
import { toast } from 'sonner';
import { ResumeData, SuperTailorResult } from '@/types/resume';

import { EDGE_FUNCTIONS_URL as CLOUD_URL, EDGE_FUNCTIONS_ANON_KEY as CLOUD_KEY } from '@/lib/supabaseConstants';

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

  const handleAction = async (actionId: ActionId) => {
    setLoading(actionId);

    try {
      let instruction = '';

      switch (actionId) {
        case 'quantify':
          instruction = `Review these resume bullet points and add specific metrics, numbers, and quantifiable results where possible. Only modify bullets that currently lack metrics. Return the enhanced experience array in the same format.

Experience:
${JSON.stringify(tailorResult.experience, null, 2)}

Job Description:
${jobDescription}

Return JSON: { "experience": [...enhanced experience entries...] }`;
          break;
        case 'projects':
          instruction = `Based on this job description, suggest 2-3 relevant side projects the candidate could add to strengthen their application. Use their existing skills and experience as a foundation. Don't fabricate - suggest realistic projects they could actually build.

Skills: ${tailorResult.skills.join(', ')}
Job: ${jobDescription}

Return JSON: { "projects": [{ "name": "...", "description": "...", "technologies": ["..."] }] }`;
          break;
        case 'reorder':
          instruction = `Given this job description, recommend the optimal order of resume sections for maximum impact. Consider what the hiring manager looks for first.

Job: ${jobDescription}
Current sections: summary, experience, education, skills, certifications

Return JSON: { "recommendedOrder": ["section1", "section2", ...], "reasoning": "..." }`;
          break;
      }

      const result = await executeAI(async () => {
        const token = await getClerkSupabaseToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${CLOUD_URL}/functions/v1/enhance-section`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': CLOUD_KEY,
          },
          body: JSON.stringify({
            section: 'custom',
            content: instruction,
            instruction,
          }),
        });

        if (!res.ok) throw new Error(`Edge function returned ${res.status}`);
        const data = await res.json();
        if (data?.error) throw new Error(data.message || data.error);
        return data;
      });

      if (!result) {
        setLoading(null);
        return;
      }

      if (actionId === 'quantify' && result?.experience) {
        onUpdateResult({ experience: result.experience });
        toast.success('Bullets enhanced with metrics!');
      } else if (actionId === 'projects' && result?.projects) {
        toast.success(`${result.projects.length} project ideas generated! Check the suggestions.`, {
          description: result.projects.map((p: any) => p.name).join(', '),
          duration: 6000,
        });
      } else if (actionId === 'reorder' && result?.recommendedOrder) {
        toast.success('Section order optimized!', {
          description: result.reasoning || 'Sections reordered for maximum impact',
          duration: 6000,
        });
      } else {
        toast.success('Action completed!');
      }

      setCompleted(prev => [...prev, actionId]);
    } catch (err) {
      console.error('Quick action error:', err);
      const msg = err instanceof Error ? err.message : 'Action failed. Please try again.';
      showErrorToast(msg, err);
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
