import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useResumeStore } from '@/store/resumeStore';
import { sendChatMessage, ChatMessage } from '@/lib/agenticChat';
import { haptics } from '@/lib/haptics';

export function useAgenticChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const { currentResume, updateResume } = useResumeStore();

  const executeFunctionCall = useCallback(
    (functionName: string, args: Record<string, unknown>) => {
      if (!currentResume) return;

      switch (functionName) {
        case 'update_summary': {
          updateResume({ summary: args.newSummary as string });
          haptics.success();
          break;
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
          break;
        }
        case 'update_skills': {
          updateResume({ skills: args.skills as string[] });
          haptics.success();
          break;
        }
        case 'add_skills': {
          const newSkills = args.skills as string[];
          const merged = [...new Set([...currentResume.skills, ...newSkills])];
          updateResume({ skills: merged });
          haptics.success();
          break;
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
          break;
        }
        case 'proofread': {
          haptics.light();
          break;
        }
        default:
          break;
      }
    },
    [currentResume, updateResume]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

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

        if (response.type === 'function_call') {
          executeFunctionCall(response.functionName, response.args);

          const assistantMsg: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            functionCall: {
              name: response.functionName,
              args: response.args,
            },
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
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
  };
}
