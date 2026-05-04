import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useResumeStore } from '@/store/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { sendChatMessage, sendFunctionFeedback, ChatMessage, SuggestionProposal, FunctionResult, ChatError, ChatErrorInfo } from '@/lib/agenticChat';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { haptics } from '@/lib/haptics';
import { useAICreditsMutations } from './useAICredits';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/safeClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResumeData } from '@/types/resume';
import { useAIApplyEffects } from './useAIApplyEffects';

export interface PendingChatAction {
  type: 'open_company_briefing';
  companyName: string;
}

export interface PendingConfirmation {
  functionName: string;
  args: Record<string, unknown>;
  originalUserText: string;
  historyAtCall: ChatMessage[];
  activeSessionId: string | null;
}

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

function buildChatErrorInfo(error: unknown): ChatErrorInfo {
  if (error instanceof ChatError) {
    const baseMap: Record<typeof error.kind, { title: string; retryable: boolean; showSettings: boolean }> = {
      rate_limit_client: { title: 'Slow down a moment', retryable: true, showSettings: false },
      rate_limit_server: { title: 'Server is busy', retryable: true, showSettings: true },
      service_unavailable: { title: 'AI temporarily unavailable', retryable: true, showSettings: true },
      credits: { title: 'Out of free credits', retryable: false, showSettings: true },
      invalid_key: { title: 'AI key issue', retryable: true, showSettings: true },
      model_error: { title: 'Model unavailable', retryable: true, showSettings: true },
      timeout: { title: 'Took too long', retryable: true, showSettings: true },
      network: { title: 'Network problem', retryable: true, showSettings: false },
      unknown: { title: 'Something went wrong', retryable: true, showSettings: false },
    };
    const meta = baseMap[error.kind];
    return {
      kind: error.kind,
      title: meta.title,
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
      retryable: meta.retryable,
      showSettings: meta.showSettings,
    };
  }
  return {
    kind: 'unknown',
    title: 'Something went wrong',
    message: error instanceof Error ? error.message : 'Please try again.',
    retryable: true,
    showSettings: false,
  };
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
  const [pendingAction, setPendingAction] = useState<PendingChatAction | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const { currentResume, currentResumeId, updateResume, lastSavedAt } = useResumeStore();
  const { data: allResumes = [] } = useResumes();
  const { incrementUsage, checkCredits } = useAICreditsMutations();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Session persistence refs — use refs to avoid stale closures in fire-and-forget writes
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionLoadedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Reset all in-memory session state on auth change (user switch or logout)
  // This prevents user-A's conversation leaking to user-B in the same SPA runtime
  useEffect(() => {
    const currentUserId = user?.id;
    if (prevUserIdRef.current === currentUserId) return;
    prevUserIdRef.current = currentUserId;
    setMessages([]);
    sessionIdRef.current = null;
    setSessionId(null);
    sessionLoadedRef.current = false;
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          case 'get_company_briefing': {
            const companyName = (args.companyName as string) || '';
            setPendingAction({ type: 'open_company_briefing', companyName });
            return { name: functionName, result: { success: true, applied: { companyName } } };
          }
          case 'open_job_tracker': {
            navigate('/applications');
            haptics.light();
            return { name: functionName, result: { success: true, applied: { navigated: '/applications' } } };
          }
          default:
            return { name: functionName, result: { success: false, error: `Unknown function: ${functionName}` } };
        }
      } catch (error) {
        return { name: functionName, result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },
    [currentResume, updateResume, confirmAndApply, navigate]
  );

  const { rescoreAfterApply } = useAIApplyEffects(currentResumeId ?? undefined);

  const applySuggestion = useCallback(
    (proposal: SuggestionProposal) => {
      if (!currentResume) return;

      // Helper: kick off ATS rescore against the latest store snapshot
      // after any mutation so the score panel never lags the apply.
      const rescoreLatest = () => {
        const next = useResumeStore.getState().currentResume;
        if (next) void rescoreAfterApply(next);
      };

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
            rescoreLatest();
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
          rescoreLatest();
          return;
        }

        toast('Could not find the experience entry to delete. It may have already been removed.');
        return;
      }

      if (proposal.section === 'summary') {
        updateResume({ summary: proposal.suggested });
      } else if (proposal.section === 'experience' && proposal.itemId) {
        // Match the experience entry the AI is referring to using the
        // same id → fingerprint → substring contract that the rest of
        // the AI Apply surfaces use. This stops a stale itemId or a
        // company/position rename from silently no-oping the apply, and
        // it stops two entries with similar names from both matching.
        const itemId = proposal.itemId;
        const identifier = itemId.toLowerCase();
        // 1) Exact UUID match on exp.id (preferred — set by the edge
        //    function whenever the AI gave us a real id).
        let expIndex = currentResume.experience.findIndex((exp) => exp.id === itemId);
        // 2) Position/company "fingerprint" match (case-insensitive
        //    exact field equality before falling through to substring).
        if (expIndex === -1) {
          expIndex = currentResume.experience.findIndex(
            (exp) =>
              exp.position?.toLowerCase() === identifier ||
              exp.company?.toLowerCase() === identifier,
          );
        }
        // 3) Last-resort substring match (legacy behavior — kept so
        //    existing prompt formats keep working).
        if (expIndex === -1) {
          expIndex = currentResume.experience.findIndex(
            (exp) =>
              exp.company.toLowerCase().includes(identifier) ||
              exp.position.toLowerCase().includes(identifier),
          );
        }
        if (expIndex !== -1) {
          const updatedExp = { ...currentResume.experience[expIndex] };
          if (updatedExp.description?.includes(proposal.original)) {
            updatedExp.description = updatedExp.description.replace(proposal.original, proposal.suggested);
          }
          const newExperience = [...currentResume.experience];
          // Preserve the original id explicitly — never let a spread
          // overwrite the row identity for an in-place edit.
          newExperience[expIndex] = { ...updatedExp, id: currentResume.experience[expIndex].id };
          updateResume({ experience: newExperience });
        } else {
          // Bail out early so we don't fire the trailing success haptic
          // and ATS rescore for an apply that didn't actually mutate.
          toast(
            "Couldn't locate the experience entry to update — it may have been renamed or removed.",
          );
          return;
        }
      } else if (proposal.section === 'skills') {
        const suggestedSkills = proposal.suggested.split(',').map((s) => s.trim()).filter(Boolean);
        if (suggestedSkills.length > 0) {
          updateResume({ skills: suggestedSkills });
        }
      }
      haptics.success();
      // Force ATS rescore against the freshly-mutated resume so the
      // dashboard / detail panels reflect the chat-applied change without
      // waiting for the debounced autosave round-trip.
      const next = useResumeStore.getState().currentResume;
      if (next) void rescoreAfterApply(next);
    },
    [currentResume, updateResume, rescoreAfterApply]
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
    async (text: string, historyOverride?: ChatMessage[]) => {
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

      const reqStartedAt = Date.now();
      try {
        const resumeList = allResumes.map(r => ({ id: r.id, title: r.title }));
        // Guest users (unauthenticated) keep pre-existing 10-message history limit
        const baseHistory = historyOverride ?? messages;
        const historyToSend = user ? baseHistory : baseHistory.slice(-10);
        const response = await sendChatMessage(text.trim(), historyToSend, currentResume, { resumeList, contextFilter });

        useAIHealthStore.getState().recordSuccess(Date.now() - reqStartedAt);
        incrementUsage.mutate();
        toast.success('1 credit used', { description: 'AI chat', duration: 2500, icon: '⚡' });

        if (response.type === 'function_call') {
          const isOverwrite = OVERWRITE_FUNCTIONS.has(response.functionName);

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

          if (isOverwrite) {
            // For overwrite-risk functions, always require user confirmation via the
            // inline chat card before mutating resume data. Execution resumes in
            // applyPendingConfirmation / dismissPendingConfirmation below.
            const historyAtCall = user
              ? [...messages, userMsg, initialMsg]
              : [...messages, userMsg, initialMsg].slice(-10);
            setPendingConfirmation({
              functionName: response.functionName,
              args: response.args,
              originalUserText: text.trim(),
              historyAtCall,
              activeSessionId,
            });
            // isThinking is cleared by the outer finally block
            return;
          }

          // Non-overwrite: apply immediately (existing behavior)
          const functionResult = executeFunctionCall(response.functionName, response.args);

          try {
            const feedbackHistory = user
              ? [...messages, userMsg, initialMsg]
              : [...messages, userMsg, initialMsg].slice(-10);
            const feedbackResponse = await sendFunctionFeedback(
              text.trim(),
              feedbackHistory,
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
        const info = buildChatErrorInfo(error);

        // Record health: client-side rate limit isn't a backend failure
        if (info.kind !== 'rate_limit_client') {
          const status =
            info.kind === 'credits' ? 402 :
            info.kind === 'timeout' ? 408 :
            info.kind === 'rate_limit_server' ? 429 :
            info.kind === 'service_unavailable' ? 503 :
            info.kind === 'invalid_key' ? 401 : 0;
          useAIHealthStore.getState().recordFailure(status);
        }

        const errMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: info.message,
          error: info,
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

  // Resend the last user message after an error. Determines the target
  // synchronously from current `messages` (NOT inside a setMessages updater,
  // since updaters are queued and the captured variable wouldn't be
  // observable until the next render). Only activates when the trailing
  // assistant message carries an error — otherwise this would silently
  // truncate a healthy conversation.
  const retryLastMessage = useCallback(() => {
    const current = messages;
    if (current.length === 0) return;

    const trailing = current[current.length - 1];
    const trailingIsErrorReply =
      trailing.role === 'assistant' && !!trailing.error;
    if (!trailingIsErrorReply) return;

    let userIdx = -1;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].role === 'user') {
        userIdx = i;
        break;
      }
    }
    if (userIdx === -1) return;

    const lastUserText = current[userIdx].content;
    if (!lastUserText) return;

    // Drop the failed user message + the error reply, then resend with the
    // truncated history passed explicitly so sendMessage doesn't re-include
    // the failed turn from its closure-captured `messages`.
    const truncated = current.slice(0, userIdx);
    setMessages(truncated);
    void sendMessage(lastUserText, truncated);
  }, [messages, sendMessage]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    setSessionId(null);
  }, []);

  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  // Called by the ConfirmApplyCard when the user clicks "Apply Changes"
  const applyPendingConfirmation = useCallback(async () => {
    if (!pendingConfirmation) return;
    const conf = pendingConfirmation;
    setPendingConfirmation(null);
    setIsThinking(true);

    try {
      const functionResult = executeFunctionCall(conf.functionName, conf.args);
      const feedbackResponse = await sendFunctionFeedback(
        conf.originalUserText,
        conf.historyAtCall,
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
        if (conf.activeSessionId) {
          persistMessage(conf.activeSessionId, 'assistant', feedbackResponse.content);
        }
      }
    } catch {
      // Feedback failure is non-fatal; the function was already applied
    } finally {
      setIsThinking(false);
    }
  }, [pendingConfirmation, executeFunctionCall, currentResume, persistMessage]);

  const dismissPendingConfirmation = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  return {
    messages,
    isThinking,
    sessionId,
    pendingAction,
    clearPendingAction,
    pendingConfirmation,
    applyPendingConfirmation,
    dismissPendingConfirmation,
    sendMessage,
    retryLastMessage,
    startNewSession,
    loadSession,
    updateSuggestionStatus,
  };
}
