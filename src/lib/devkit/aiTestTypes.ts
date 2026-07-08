import type { AITestProvider } from './aiTestSlotModels';

  | 'success'
  | 'key_missing'
  | 'missing_key'
  | 'invalid_key'
  | 'model_not_found'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'timeout'
  | 'bad_response_shape'
  | 'quota_exceeded'
  | 'unknown_provider_error'
  | 'provider_error';

export type FrontendSlotTestState = 'untested' | 'testing' | BackendSlotTestStatus;

export interface SlotTestResult {
  ok: boolean;
  provider: AITestProvider;
  slot: number;
  model: string;
  status: BackendSlotTestStatus;
  httpStatus?: number;
  latencyMs?: number;
  testedAt: string;
  keyPreview?: string | null;
  message?: string;
  errorExcerpt?: string;
}

export type SlotTestResultsMap = Record<string, SlotTestResult>;

export interface TestSlotActionPayload {
  action: 'test-ai-key-slot';
  provider: AITestProvider;
  slot: number;
  model: string;
}

export interface TestProviderActionPayload {
  action: 'test-ai-provider';
  provider: AITestProvider;
  modelOverrides?: Record<string, string>;
}

export interface TestAllKeysActionPayload {
  action: 'test-all-ai-keys';
  modelOverrides?: Record<string, string>;
}

export type AIKeyTestActionPayload =
  | TestSlotActionPayload
  | TestProviderActionPayload
  | TestAllKeysActionPayload;
