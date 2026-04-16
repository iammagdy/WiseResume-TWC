import { ResumeData } from '@/types/resume';
import { checkAIRateLimit } from './rateLimiter';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { trackGeminiUsage } from './aiProvider';

export type ChatErrorKind =
  | 'rate_limit_client'
  | 'rate_limit_server'
  | 'credits'
  | 'invalid_key'
  | 'model_error'
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

  // 1. Rate limits — handled first since they're recoverable just by waiting
  if (errCode === 'rate_limit' || status === 429 || combined.includes('rate limit')) {
    const fromBody = typeof dataObj.retryAfterSeconds === 'number' ? dataObj.retryAfterSeconds : undefined;
    const m = !fromBody ? message.match(/(\d+)\s*s/) : null;
    throw new ChatError('rate_limit_server', message || 'Server is busy. Wait a moment, or switch to your own AI key in AI Settings for higher limits.', {
      retryAfterSeconds: fromBody ?? (m ? Number(m[1]) : undefined),
      status: 429,
    });
  }

  // 2. Invalid key — must check BEFORE 402/credits because BYOK key failures
  // surface as 402 from the edge function but with error: 'invalid_key' in body.
  // Also catches OpenAI/Anthropic 401 / "Invalid API key" responses.
  if (
    errCode === 'invalid_key' ||
    errCode === 'unauthorized' ||
    status === 401 ||
    combined.includes('invalid api key') ||
    combined.includes('your ai key') ||
    (combined.includes('api key') && (combined.includes('failed') || combined.includes('check') || combined.includes('invalid')))
  ) {
    throw new ChatError('invalid_key', message || rawMsg || 'Your AI key isn\'t working. Please re-check it in AI Settings.', { status: status ?? 401 });
  }

  // 3. Credits — only matches the explicit 'credits' code or unambiguous credit text
  if (errCode === 'credits' || errCode === 'payment_required' || combined.includes('insufficient ai credits') || combined.includes('used your free ai credits') || combined.includes('credits exhausted')) {
    throw new ChatError('credits', message || 'You\'ve used your free AI credits. Add your own key for unlimited chat.', { status: 402 });
  }

  // 4. Model selection / unsupported model errors
  if (
    errCode === 'model_error' ||
    combined.includes('model not found') ||
    combined.includes('no model selected') ||
    combined.includes('unsupported model') ||
    combined.includes('invalid model') ||
    (status === 400 && combined.includes('model'))
  ) {
    throw new ChatError('model_error', message || rawMsg || 'The selected AI model isn\'t available. Pick a different model in AI Settings.', { status: status ?? 400 });
  }

  // 5. Service unavailable
  if (errCode === 'service_unavailable' || errCode === 'provider_busy' || status === 503) {
    throw new ChatError('service_unavailable', message || 'AI service is temporarily unavailable.', { status: 503 });
  }

  // 6. Timeout
  if (combined.includes('timed out') || combined.includes('timeout') || status === 408) {
    throw new ChatError('timeout', 'The AI took too long to respond. Try again or switch to a faster model in AI Settings.', { status: 408 });
  }

  // 7. Network
  if (errCode === 'network' || combined.includes('failed to fetch') || combined.includes('network')) {
    throw new ChatError('network', 'Network error. Check your connection and try again.');
  }

  // 8. Anything else — fall through to a leftover 402 (defensive in case
  // a future edge response uses 402 without a typed code).
  if (status === 402) {
    throw new ChatError('credits', message || 'Payment required to continue using AI.', { status: 402 });
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
      `You're sending messages a bit too quickly. Wait ${rateCheck.waitSeconds || 30}s, or add your own AI key in AI Settings for higher limits.`,
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
