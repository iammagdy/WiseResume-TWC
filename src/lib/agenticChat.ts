import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { trackGeminiUsage } from './aiProvider';

export type ChatErrorKind =
  | 'rate_limit_client'
  | 'rate_limit_server'
  | 'credits'
  | 'invalid_key'
  | 'timeout'
  | 'service_unavailable'
  | 'network'
  | 'unknown';

export interface ChatErrorInfo {
  kind: ChatErrorKind;
  title: string;
  message: string;
  retryAfterSeconds?: number;
  retryable: boolean;
  showSettings: boolean;
}

export class ChatError extends Error {
  kind: ChatErrorKind;
  retryAfterSeconds?: number;
  status?: number;
  constructor(
    kind: ChatErrorKind,
    message: string,
    opts?: { retryAfterSeconds?: number; status?: number }
  ) {
    super(message);
    this.name = 'ChatError';
    this.kind = kind;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
    this.status = opts?.status;
  }
}

export function classifyAndThrow(error: unknown, data: unknown): never {
  const dataObj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const errCode = String(dataObj.error ?? '').toLowerCase();
  const message = String(dataObj.message ?? '');
  const rawMsg = error instanceof Error ? error.message : String(error ?? '');
  const combined = `${errCode} ${message} ${rawMsg}`.toLowerCase();

  // Try to read HTTP-ish status from supabase FunctionsError context
  const status =
    (error as { context?: { status?: number } } | null)?.context?.status ??
    (error as { status?: number } | null)?.status;

  if (errCode === 'rate_limit' || status === 429 || combined.includes('rate limit')) {
    const m = message.match(/(\d+)\s*s/);
    throw new ChatError('rate_limit_server', message || 'Server is busy. Please wait a moment.', {
      retryAfterSeconds: m ? Number(m[1]) : undefined,
      status: 429,
    });
  }
  if (errCode === 'service_unavailable' || status === 503) {
    throw new ChatError('service_unavailable', message || 'AI service is temporarily unavailable.', { status: 503 });
  }
  if (status === 402 || combined.includes('insufficient ai credits') || combined.includes('payment')) {
    throw new ChatError('credits', message || 'You\'ve used your free AI credits. Add your own key for unlimited chat.', { status: 402 });
  }
  if (combined.includes('api key') || combined.includes('invalid_key') || status === 401) {
    throw new ChatError('invalid_key', message || rawMsg || 'Your AI key isn\'t working. Please re-check it in AI Settings.', { status: status ?? 401 });
  }
  if (combined.includes('timed out') || combined.includes('timeout') || status === 408) {
    throw new ChatError('timeout', 'The AI took too long to respond. Try again or switch to a faster model.', { status: 408 });
  }
  if (combined.includes('failed to fetch') || combined.includes('network')) {
    throw new ChatError('network', 'Network error. Check your connection and try again.');
  }
  throw new ChatError('unknown', message || rawMsg || 'Something went wrong. Please try again.', { status });
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  suggestion?: SuggestionProposal[];
  error?: ChatErrorInfo;
  timestamp: number;
}

export interface SuggestionProposal {
  section: string;
  itemId?: string;
  original: string;
  suggested: string;
  explanation: string;
  action?: 'delete' | 'update';
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
    resumeList?: Array<{ id: string; title: string }>;
    contextFilter?: string;
  }
): Promise<ChatResponse> {
  const rateCheck = checkAIRateLimit('chat');
  if (!rateCheck.allowed) {
    throw new ChatError(
      'rate_limit_client',
      `You're sending messages a bit too quickly. Try again in ${rateCheck.waitSeconds || 30}s.`,
      { retryAfterSeconds: rateCheck.waitSeconds || 30 }
    );
  }

  const historyForApi = conversationHistory.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { data, error } = await edgeFunctions.functions.invoke('agentic-chat', {
    body: {
      message,
      conversationHistory: historyForApi,
      currentResume,
      functionResponse: options?.functionResponse,
      resumeList: options?.resumeList,
      contextFilter: options?.contextFilter,
    },
  });

  if (error) {
    console.error('Chat error:', error);
    classifyAndThrow(error, data);
  }
  if (data?.error) {
    classifyAndThrow(new Error(String(data.error)), data);
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
