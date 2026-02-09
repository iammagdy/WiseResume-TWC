import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  timestamp: number;
}

interface FunctionCallResponse {
  type: 'function_call';
  functionName: string;
  args: Record<string, unknown>;
  message: string;
}

interface TextResponse {
  type: 'text';
  content: string;
}

type ChatResponse = FunctionCallResponse | TextResponse;

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[],
  currentResume: ResumeData | null
): Promise<ChatResponse> {
  const rateCheck = checkAIRateLimit('chat');
  if (!rateCheck.allowed) {
    throw new Error(`Too many messages. Please wait ${rateCheck.waitSeconds}s.`);
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const historyForApi = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      message,
      conversationHistory: historyForApi,
      currentResume,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted.');
    }
    throw new Error(error.error || 'Chat request failed');
  }

  return response.json();
}
