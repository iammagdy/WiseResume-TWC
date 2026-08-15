export type RequestTerminalState = 'timeout' | 'error';

export function classifyRequestFailure(message: string, timeoutMarker: string): RequestTerminalState {
  return message.toLowerCase().includes(timeoutMarker.toLowerCase()) ? 'timeout' : 'error';
}

export function unavailableMetric(value: number | null | undefined): number | 'Unavailable' {
  return value == null ? 'Unavailable' : value;
}
