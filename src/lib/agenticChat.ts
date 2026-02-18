import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { supabase } from '@/integrations/supabase/safeClient';
import { trackGeminiUsage } from './aiProvider';
import { extractErrorMessage } from './errorToast';
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  suggestion?: SuggestionProposal[];
  timestamp: number;
}

export interface SuggestionProposal {
  section: string;
  itemId?: string;
  original: string;
  suggested: string;
  explanation: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

interface FunctionCallResponse {
  type: 'function_call';
  functionName: string;
  args: Record<string, unknown>;
  message: string;
}

interface SuggestionResponse {
  type: 'suggestion';
  proposals: SuggestionProposal[];
  message: string;
}

interface TextResponse {
  type: 'text';
  content: string;
}

type ChatResponse = FunctionCallResponse | SuggestionResponse | TextResponse;

export interface FunctionResult {
  name: string;
  result: {
    success: boolean;
    applied?: Record<string, unknown>;
    error?: string;
  };
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[],
  currentResume: ResumeData | null,
  options?: {
    functionResponse?: FunctionResult;
  }
): Promise<ChatResponse> {
  const rateCheck = checkAIRateLimit('chat');
  if (!rateCheck.allowed) {
    throw new Error(`Too many messages. Please wait ${rateCheck.waitSeconds}s.`);
  }

  const historyForApi = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { data, error } = await supabase.functions.invoke('agentic-chat', {
    body: {
      message,
      conversationHistory: historyForApi,
      currentResume,
      functionResponse: options?.functionResponse,
    },
  });

  if (error) {
    console.error('Chat error:', error);
    throw new Error(extractErrorMessage(error, data, 'Chat request failed'));
  }
  if (data?.error) {
    throw new Error(data.message || data.error);
  }

  trackGeminiUsage();
  return data;
}

// Helper to send closed-loop feedback after function execution
export async function sendFunctionFeedback(
  originalMessage: string,
  conversationHistory: ChatMessage[],
  currentResume: ResumeData | null,
  functionResult: FunctionResult
): Promise<ChatResponse> {
  return sendChatMessage(originalMessage, conversationHistory, currentResume, {
    functionResponse: functionResult,
  });
}
