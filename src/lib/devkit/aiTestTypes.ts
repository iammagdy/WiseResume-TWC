import type { AITestProvider } from './aiTestSlotModels';

export type BackendSlotTestStatus =
  | 'success'
  | 'missing_key'
  | 'invalid_key'
  | 'model_not_found'
  | 'rate_limited'
  | 'provider_error'
  | 'timeout';

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
