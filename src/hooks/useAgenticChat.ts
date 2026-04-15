import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { sendChatMessage, sendFunctionFeedback, ChatMessage, SuggestionProposal, FunctionResult } from '@/lib/agenticChat';
import { haptics } from '@/lib/haptics';
import { useAICreditsMutations } from './useAICredits';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResumeData } from '@/types/resume';

const OVERWRITE_FUNCTIONS = new Set([
  'update_summary',
  'update_experience',
  'update_skills',
  'add_skills',
]);

function getSectionLabel(functionName: string): string {
  switch (functionName) {
    case 'update_summary': return 'Summary';
    case 'update_experience': return 'Experience';
    case 'update_skills': return 'Skills';
    case 'add_skills': return 'Skills';
    default: return 'this section';
  }
}

type SectionKey = 'summary' | 'experience' | 'skills';

function getSectionKey(functionName: string): SectionKey | null {
  switch (functionName) {
    case 'update_summary': return 'summary';
    case 'update_experience': return 'experience';
    case 'update_skills': return 'skills';
    case 'add_skills': return 'skills';
    default: return null;
  }
}

function sectionSnapshot(resume: ResumeData | null, sectionKey: SectionKey): string {
  if (!resume) return '';
  const val = resume[sectionKey];
  return JSON.stringify(val ?? '');
}

function deriveTitleFromMessage(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    const d = new Date();
    return `Chat — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return trimmed.slice(0, 50);
}

export function useAgenticChat(contextFilter?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const { currentResume, currentResumeId, updateResume, lastSavedAt } = useResumeStore();
  const { data: allResumes = [] } = useResumes();
  const { incrementUsage, checkCredits } = useAICreditsMutations();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Session persistence refs — use refs to avoid stale closures in fire-and-forget writes
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionLoadedRef = useRef(false);

  // Track the last-saved snapshot of section data so we can detect unsaved edits
  const savedSnapshotRef = useRef<Partial<Record<SectionKey, string>>>({});
  const resumeLoaded = currentResume !== null;

  useEffect(() => {
    if (!currentResume) {
      savedSnapshotRef.current = {};
      return;
    }
    savedSnapshotRef.current = {
      summary: sectionSnapshot(currentResume, 'summary'),
      experience: sectionSnapshot(currentResume, 'experience'),
      skills: sectionSnapshot(currentResume, 'skills'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResumeId, lastSavedAt, resumeLoaded]);

  // Load the most recent session on mount (once per auth session)
  useEffect(() => {
    if (!isAuthenticated || !user || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;

    (async () => {
      try {
        const { data: sessions } = await supabase
          .from('chat_sessions')
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!sessions || sessions.length === 0) return;
        const latestId = sessions[0].id as string;

        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', latestId)
          .order('created_at', { ascending: true });

        if (!msgs || msgs.length === 0) return;

        const loaded: ChatMessage[] = msgs.map((m) => ({
          id: uuidv4(),
          role: m.role as 'user' | 'assistant',
          content: m.content as string,
          timestamp: new Date(m.created_at as string).getTime(),
          ...(m.function_call
            ? { functionCall: (m.function_call as Record<string, unknown>) as { name: string; args: Record<string, unknown> } }
            : {}),
        }));

        setMessages(loaded);
        sessionIdRef.current = latestId;
        setSessionId(latestId);
      } catch {
        // Silently fail — persistence is best-effort
      }
    })();
  }, [isAuthenticated, user]);

  // Public: load a specific historical session by ID
  const loadSession = useCallback(async (id: string) => {
    try {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      const loaded: ChatMessage[] = (msgs ?? []).map((m) => ({
        id: uuidv4(),
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
        timestamp: new Date(m.created_at as string).getTime(),
        ...(m.function_call
          ? { functionCall: (m.function_call as Record<string, unknown>) as { name: string; args: Record<string, unknown> } }
          : {}),
      }));

      setMessages(loaded);
      sessionIdRef.current = id;
      setSessionId(id);
    } catch {
      // Silently fail
    }
  }, []);

  // Fire-and-forget: create a new session row in DB
  const createSession = useCallback(async (title: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          resume_id: currentResumeId ?? null,
          title,
        })
        .select('id')
        .single();
      if (error || !data) return null;
      queryClient.invalidateQueries({ queryKey: ['chat_sessions'] });
      return data.id as string;
    } catch {
      return null;
    }
  }, [user, currentResumeId, queryClient]);

  // Fire-and-forget: persist a message to DB
  const persistMessage = useCallback((
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    functionCallData?: { name: string; args: Record<string, unknown> }
  ) => {
    supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        function_call: functionCallData ?? null,
      })
      .then(() => {
        // Touch updated_at on session
        supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId)
          .then(() => {});
      });
  }, []);

  const hasPendingEditsForSection = useCallback((functionName: string): boolean => {
    const sectionKey = getSectionKey(functionName);
    if (!sectionKey || !currentResume) return false;
    const savedValue = savedSnapshotRef.current[sectionKey];
    if (savedValue === undefined) return false;
    const currentValue = sectionSnapshot(currentResume, sectionKey);
    return currentValue !== savedValue;
  }, [currentResume]);

  const confirmAndApply = useCallback((
    functionName: string,
    applyFn: () => FunctionResult
  ): FunctionResult => {
    const hasPending = OVERWRITE_FUNCTIONS.has(functionName) && hasPendingEditsForSection(functionName);
    if (hasPending) {
      const label = getSectionLabel(functionName);
      toast(`AI wants to update your ${label}`, {
        description: 'You have unsaved edits in this section.',
        action: {
          label: 'Apply',
          onClick: () => { applyFn(); },
        },
        cancel: {
          label: 'Dismiss',
          onClick: () => {},
        },
        duration: 8000,
      });
      return { name: functionName, result: { success: true, applied: { deferred: true, reason: 'pending_confirmation' } } };
    }
    return applyFn();
  }, [hasPendingEditsForSection]);

  const executeFunctionCall = useCallback(
    (functionName: string, args: Record<string, unknown>): FunctionResult => {
      if (!currentResume) {
        return { name: functionName, result: { success: false, error: 'No resume loaded' } };
      }

      try {
        switch (functionName) {
          case 'update_summary': {
            return confirmAndApply(functionName, () => {
              updateResume({ summary: args.newSummary as string });
              haptics.success();
              return { name: functionName, result: { success: true, applied: { newSummary: args.newSummary } } };
            });
          }
          case 'add_experience': {
            const newExp = {
              id: uuidv4(),
              company: (args.company as string) || '',
              position: (args.position as string) || '',
              startDate: (args.startDate as string) || '',
              endDate: (args.endDate as string) || '',
              current: (args.current as boolean) || false,
              description: (args.description as string) || '',
              achievements: (args.achievements as string[]) || [],
            };
            updateResume({
              experience: [...currentResume.experience, newExp],
            });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { company: newExp.company, position: newExp.position } } };
          }
          case 'update_experience': {
            const identifier = (args.identifier as string)?.toLowerCase();
            const updates = args.updates as Record<string, unknown>;
            const expIndex = currentResume.experience.findIndex(
              (exp) =>
                exp.company.toLowerCase().includes(identifier) ||
                exp.position.toLowerCase().includes(identifier)
            );
            if (expIndex === -1) {
              return { name: functionName, result: { success: false, error: `Could not find experience matching "${args.identifier}"` } };
            }
            return confirmAndApply(functionName, () => {
              const updatedExp = { ...currentResume.experience[expIndex], ...updates };
              const newExperience = [...currentResume.experience];
              newExperience[expIndex] = updatedExp;
              updateResume({ experience: newExperience });
              haptics.success();
              return { name: functionName, result: { success: true, applied: { identifier: args.identifier, updates } } };
            });
          }
          case 'update_skills': {
            return confirmAndApply(functionName, () => {
              updateResume({ skills: args.skills as string[] });
              haptics.success();
              return { name: functionName, result: { success: true, applied: { skillCount: (args.skills as string[]).length } } };
            });
          }
          case 'add_skills': {
            const newSkills = args.skills as string[];
            return confirmAndApply(functionName, () => {
              const merged = [...new Set([...currentResume.skills, ...newSkills])];
              updateResume({ skills: merged });
              haptics.success();
              return { name: functionName, result: { success: true, applied: { addedSkills: newSkills } } };
            });
          }
          case 'add_project': {
            const newProject = {
              id: uuidv4(),
              name: (args.name as string) || '',
              description: (args.description as string) || '',
              url: (args.url as string) || '',
              githubUrl: (args.githubUrl as string) || '',
              technologies: (args.technologies as string[]) || [],
              role: (args.role as string) || '',
              startDate: '',
              endDate: '',
            };
            updateResume({
              projects: [...(currentResume.projects || []), newProject],
            });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { name: newProject.name } } };
          }
          case 'update_contact': {
            const contactUpdates: Record<string, string> = {};
            for (const [key, value] of Object.entries(args)) {
              if (typeof value === 'string') {
                contactUpdates[key] = value;
              }
            }
            updateResume({
              contactInfo: { ...currentResume.contactInfo, ...contactUpdates },
            });
            haptics.success();
            return { name: functionName, result: { success: true, applied: contactUpdates } };
          }
          case 'proofread_and_fix': {
            const fixes = args.fixes as Array<{ section: string; original: string; corrected: string }>;
            let appliedCount = 0;
            fixes?.forEach((fix) => {
              if (fix.section === 'summary' && currentResume.summary) {
                const newSummary = currentResume.summary.replace(fix.original, fix.corrected);
                if (newSummary !== currentResume.summary) {
                  updateResume({ summary: newSummary });
                  appliedCount++;
                }
              }
            });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { fixesApplied: appliedCount } } };
          }
          default:
            return { name: functionName, result: { success: false, error: `Unknown function: ${functionName}` } };
        }
      } catch (error) {
        return { name: functionName, result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
    [currentResume, updateResume, confirmAndApply]
  );

  const applySuggestion = useCallback(
    (proposal: SuggestionProposal) => {
      if (!currentResume) return;

      // Handle delete action — remove exactly ONE confirmed entry
      if (proposal.action === 'delete' && proposal.section === 'experience') {
        const itemId = proposal.itemId || '';

        // 1. Preferred: exact UUID match on exp.id (set by edge function when match found)
        if (itemId) {
          const targetIdx = currentResume.experience.findIndex((exp) => exp.id === itemId);
          if (targetIdx !== -1) {
            const updated = [
              ...currentResume.experience.slice(0, targetIdx),
              ...currentResume.experience.slice(targetIdx + 1),
            ];
            updateResume({ experience: updated });
            haptics.success();
            return;
          }
        }

        // 2. Fallback: find the FIRST (and only first) matching entry by text
        const fallbackKey = itemId.toLowerCase();
        const textTargetIdx = fallbackKey
          ? currentResume.experience.findIndex(
              (exp) =>
                exp.company.toLowerCase().includes(fallbackKey) ||
                exp.position.toLowerCase().includes(fallbackKey)
            )
          : -1;

        if (textTargetIdx !== -1) {
          const updated = [
            ...currentResume.experience.slice(0, textTargetIdx),
            ...currentResume.experience.slice(textTargetIdx + 1),
          ];
          updateResume({ experience: updated });
          haptics.success();
          return;
        }

        toast('Could not find the experience entry to delete. It may have already been removed.');
        return;
      }

      if (proposal.section === 'summary') {
        updateResume({ summary: proposal.suggested });
      } else if (proposal.section === 'experience' && proposal.itemId) {
        const identifier = proposal.itemId.toLowerCase();
        const expIndex = currentResume.experience.findIndex(
          (exp) =>
            exp.company.toLowerCase().includes(identifier) ||
            exp.position.toLowerCase().includes(identifier)
        );
        if (expIndex !== -1) {
          const updatedExp = { ...currentResume.experience[expIndex] };
          if (updatedExp.description?.includes(proposal.original)) {
            updatedExp.description = updatedExp.description.replace(proposal.original, proposal.suggested);
          }
          const newExperience = [...currentResume.experience];
          newExperience[expIndex] = updatedExp;
          updateResume({ experience: newExperience });
        }
      } else if (proposal.section === 'skills') {
        const suggestedSkills = proposal.suggested.split(',').map((s) => s.trim()).filter(Boolean);
        if (suggestedSkills.length > 0) {
          updateResume({ skills: suggestedSkills });
        }
      }
      haptics.success();
    },
    [currentResume, updateResume]
  );

  const updateSuggestionStatus = useCallback(
    (messageId: string, proposalIndex: number, status: 'accepted' | 'rejected') => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.suggestion) {
            const updatedSuggestions = [...msg.suggestion];
            updatedSuggestions[proposalIndex] = {
              ...updatedSuggestions[proposalIndex],
              status,
            };

            if (status === 'accepted') {
              applySuggestion(updatedSuggestions[proposalIndex]);
            }

            return { ...msg, suggestion: updatedSuggestions };
          }
          return msg;
        })
      );

      haptics.light();
    },
    [applySuggestion]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

      const hasCredits = await checkCredits();
      if (!hasCredits) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // Ensure a session exists before persisting; create on first message
      let activeSessionId = sessionIdRef.current;
      if (!activeSessionId && user) {
        const title = deriveTitleFromMessage(text.trim());
        const newId = await createSession(title);
        if (newId) {
          activeSessionId = newId;
          sessionIdRef.current = newId;
          setSessionId(newId);
        }
      }

      if (activeSessionId) {
        persistMessage(activeSessionId, 'user', text.trim());
      }

      try {
        const resumeList = allResumes.map(r => ({ id: r.id, title: r.title }));
        const response = await sendChatMessage(text.trim(), messages, currentResume, { resumeList, contextFilter });

        incrementUsage.mutate();
        toast.success('1 credit used', { description: 'AI chat', duration: 2500, icon: '⚡' });

        if (response.type === 'function_call') {
          const functionResult = executeFunctionCall(response.functionName, response.args);

          const initialMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            functionCall: {
              name: response.functionName,
              args: response.args,
            },
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, initialMsg]);

          if (activeSessionId) {
            persistMessage(activeSessionId, 'assistant', response.message, { name: response.functionName, args: response.args });
          }

          try {
            const feedbackResponse = await sendFunctionFeedback(
              text.trim(),
              [...messages, userMsg, initialMsg],
              currentResume,
              functionResult
            );

            if (feedbackResponse.type === 'text') {
              const confirmMsg: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: feedbackResponse.content,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, confirmMsg]);
              if (activeSessionId) {
                persistMessage(activeSessionId, 'assistant', feedbackResponse.content);
              }
            }
          } catch {
            // If feedback fails, the initial message is still shown
          }
        } else if (response.type === 'suggestion') {
          const suggestionMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            suggestion: response.proposals.map((p) => ({ ...p, status: 'pending' as const })),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, suggestionMsg]);
          if (activeSessionId) {
            persistMessage(activeSessionId, 'assistant', response.message);
          }
        } else {
          const assistantMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.content,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          if (activeSessionId) {
            persistMessage(activeSessionId, 'assistant', response.content);
          }
        }
      } catch (error) {
        const errMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        haptics.error();
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages, currentResume, executeFunctionCall, allResumes, contextFilter, checkCredits, incrementUsage, user, createSession, persistMessage]
  );

  const startNewSession = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    setSessionId(null);
  }, []);

  return {
    messages,
    isThinking,
    sessionId,
    sendMessage,
    startNewSession,
    loadSession,
    updateSuggestionStatus,
  };
}
