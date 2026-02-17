import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useResumeStore } from '@/store/resumeStore';
import { sendChatMessage, sendFunctionFeedback, ChatMessage, SuggestionProposal, FunctionResult } from '@/lib/agenticChat';
import { haptics } from '@/lib/haptics';
import { useAICreditsMutations } from './useAICredits';
import { toast } from 'sonner';

export function useAgenticChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const { currentResume, updateResume } = useResumeStore();
  const { incrementUsage, checkCredits } = useAICreditsMutations();

  const executeFunctionCall = useCallback(
    (functionName: string, args: Record<string, unknown>): FunctionResult => {
      if (!currentResume) {
        return { name: functionName, result: { success: false, error: 'No resume loaded' } };
      }

      try {
        switch (functionName) {
          case 'update_summary': {
            updateResume({ summary: args.newSummary as string });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { newSummary: args.newSummary } } };
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
            const updatedExp = { ...currentResume.experience[expIndex], ...updates };
            const newExperience = [...currentResume.experience];
            newExperience[expIndex] = updatedExp;
            updateResume({ experience: newExperience });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { identifier: args.identifier, updates } } };
          }
          case 'update_skills': {
            updateResume({ skills: args.skills as string[] });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { skillCount: (args.skills as string[]).length } } };
          }
          case 'add_skills': {
            const newSkills = args.skills as string[];
            const merged = [...new Set([...currentResume.skills, ...newSkills])];
            updateResume({ skills: merged });
            haptics.success();
            return { name: functionName, result: { success: true, applied: { addedSkills: newSkills } } };
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
            // Auto-apply all fixes
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
              // Could add more section handling here
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
    [currentResume, updateResume]
  );

  const applySuggestion = useCallback(
    (proposal: SuggestionProposal) => {
      if (!currentResume) return;

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
          // Try to replace in description or achievements
          if (updatedExp.description?.includes(proposal.original)) {
            updatedExp.description = updatedExp.description.replace(proposal.original, proposal.suggested);
          }
          const newExperience = [...currentResume.experience];
          newExperience[expIndex] = updatedExp;
          updateResume({ experience: newExperience });
        }
      } else if (proposal.section === 'skills') {
        // For skills, the suggestion might be adding/removing specific skills
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
            
            // If accepting, apply the suggestion
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

      // Check credits before sending
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

      try {
        const response = await sendChatMessage(text.trim(), messages, currentResume);

        // Deduct credit on success
        incrementUsage.mutate();
        toast.success('1 credit used', { description: 'AI chat', duration: 2500, icon: '⚡' });

        if (response.type === 'function_call') {
          // Execute function locally
          const functionResult = executeFunctionCall(response.functionName, response.args);

          // Add initial response with function call indicator
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

          // Send feedback to AI for closed-loop confirmation
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
            }
          } catch {
            // If feedback fails, the initial message is still shown
          }
        } else if (response.type === 'suggestion') {
          // Show suggestion cards for user approval
          const suggestionMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            suggestion: response.proposals.map((p) => ({ ...p, status: 'pending' as const })),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, suggestionMsg]);
        } else {
          const assistantMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.content,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
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
    [isThinking, messages, currentResume, executeFunctionCall]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isThinking,
    sendMessage,
    clearChat,
    updateSuggestionStatus,
  };
}
