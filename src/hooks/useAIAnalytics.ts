import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from './useAuth';
import { Json } from '@/integrations/supabase/types';

export type AIActionType = 'enhance' | 'generate' | 'tailor' | 'analyze' | 'suggest';
export type AISectionType = 'summary' | 'experience' | 'skills' | 'education' | 'contact' | 'all';

interface AIUsageLog {
  id: string;
  user_id: string;
  resume_id: string | null;
  action_type: string;
  section: string | null;
  metadata: Json | null;
  created_at: string;
}

interface LogAIUsageParams {
  resumeId?: string;
  actionType: AIActionType;
  section?: AISectionType;
  metadata?: Record<string, unknown>;
}

interface AIUsageStats {
  totalActions: number;
  actionsByType: Record<AIActionType, number>;
  actionsBySection: Record<string, number>;
  mostUsedAction: AIActionType | null;
  lastWeekActions: number;
}

export function useAIAnalytics() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Log AI usage
  const logUsage = useMutation({
    mutationFn: async ({ resumeId, actionType, section, metadata = {} }: LogAIUsageParams) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          resume_id: resumeId || null,
          action_type: actionType,
          section: section || null,
          metadata: metadata as Json,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log AI usage:', error);
        return null;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage-stats', user?.id] });
    },
  });

  // Get usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ai-usage-stats', user?.id],
    queryFn: async (): Promise<AIUsageStats> => {
      if (!user) {
        return {
          totalActions: 0,
          actionsByType: {} as Record<AIActionType, number>,
          actionsBySection: {},
          mostUsedAction: null,
          lastWeekActions: 0,
        };
      }

      // Get all usage logs
      const { data: logs, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch AI usage stats:', error);
        return {
          totalActions: 0,
          actionsByType: {} as Record<AIActionType, number>,
          actionsBySection: {},
          mostUsedAction: null,
          lastWeekActions: 0,
        };
      }

      const typedLogs = logs as AIUsageLog[];
      const actionsByType: Record<string, number> = {};
      const actionsBySection: Record<string, number> = {};
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let lastWeekActions = 0;

      typedLogs.forEach((log) => {
        // Count by action type
        actionsByType[log.action_type] = (actionsByType[log.action_type] || 0) + 1;

        // Count by section
        if (log.section) {
          actionsBySection[log.section] = (actionsBySection[log.section] || 0) + 1;
        }

        // Count last week actions
        if (new Date(log.created_at) >= oneWeekAgo) {
          lastWeekActions++;
        }
      });

      // Find most used action
      let mostUsedAction: AIActionType | null = null;
      let maxCount = 0;
      Object.entries(actionsByType).forEach(([action, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostUsedAction = action as AIActionType;
        }
      });

      return {
        totalActions: typedLogs.length,
        actionsByType: actionsByType as Record<AIActionType, number>,
        actionsBySection,
        mostUsedAction,
        lastWeekActions,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get recent actions for a specific resume
  const getResumeAIHistory = async (resumeId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch resume AI history:', error);
      return [];
    }

    return data as AIUsageLog[];
  };

  return {
    logUsage: logUsage.mutate,
    logUsageAsync: logUsage.mutateAsync,
    isLogging: logUsage.isPending,
    stats: stats || {
      totalActions: 0,
      actionsByType: {} as Record<AIActionType, number>,
      actionsBySection: {},
      mostUsedAction: null,
      lastWeekActions: 0,
    },
    statsLoading,
    getResumeAIHistory,
  };
}

// Convenience hook for logging AI actions inline
export function useLogAIAction() {
  const { logUsage } = useAIAnalytics();
  return logUsage;
}
