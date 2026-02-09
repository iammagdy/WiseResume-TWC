import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';

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
    thinkingMode?: boolean;
    functionResponse?: FunctionResult;
  }
): Promise<ChatResponse> {
  const rateCheck = checkAIRateLimit('chat');
  if (!rateCheck.allowed) {
    throw new Error(`Too many messages. Please wait ${rateCheck.waitSeconds}s.`);
  }

  const userGeminiKey = getUserGeminiKey();

  const historyForApi = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      message,
      conversationHistory: historyForApi,
      currentResume,
      userGeminiKey,
      thinkingMode: options?.thinkingMode ?? false,
      functionResponse: options?.functionResponse,
    }),
  });

  if (!response.ok) {
    await handleAIError(response, 'Chat request failed');
  }

  trackGeminiUsage();
  return response.json();
}

// Helper to send closed-loop feedback after function execution
export async function sendFunctionFeedback(
  originalMessage: string,
  conversationHistory: ChatMessage[],
  currentResume: ResumeData | null,
  functionResult: FunctionResult,
  thinkingMode?: boolean
): Promise<ChatResponse> {
  return sendChatMessage(originalMessage, conversationHistory, currentResume, {
    thinkingMode,
    functionResponse: functionResult,
  });
}
