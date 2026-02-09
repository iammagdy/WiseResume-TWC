import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { getUserGeminiKey, trackGeminiUsage } from './aiProvider';
import { supabase, supabaseConfig } from '@/integrations/supabase/safeClient';

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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be logged in to use the chat.');
  }

  const SUPABASE_URL = supabaseConfig.url;
  const userGeminiKey = getUserGeminiKey();

  const historyForApi = conversationHistory.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message,
      conversationHistory: historyForApi,
      currentResume,
      userGeminiKey,
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
    if (response.status === 401 && error.error?.includes('Invalid')) {
      throw new Error('Invalid Gemini API key. Please check your AI settings.');
    }
    throw new Error(error.error || 'Chat request failed');
  }

  trackGeminiUsage();
  return response.json();
}
