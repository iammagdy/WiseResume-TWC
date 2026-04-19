import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

export type EmailCheckReason =
  | 'invalid_format'
  | 'consumer_domain'
  | 'existing_wiseresume_user'
  | 'already_on_waitlist'
  | 'service_error';

export type EmailCheckStatus = 'idle' | 'checking' | 'ok' | 'error';

export interface EmailCheckState {
  status: EmailCheckStatus;
  reason: EmailCheckReason | null;
  /** True when reason is consumer_domain AND the email is also an existing WiseResume user. */
  alsoExistingUser: boolean;
  checkedEmail: string | null;
}

interface CheckResponse {
  valid_format: boolean;
  is_consumer_domain: boolean;
  existing_wiseresume_user: boolean;
  already_on_waitlist: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEBOUNCE_MS = 400;

export function useWaitlistEmailCheck() {
  const [state, setState] = useState<EmailCheckState>({
    status: 'idle',
    reason: null,
    alsoExistingUser: false,
    checkedEmail: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    requestIdRef.current += 1;
    setState({ status: 'idle', reason: null, alsoExistingUser: false, checkedEmail: null });
  }, []);

  const runCheck = useCallback(async (email: string): Promise<EmailCheckState> => {
    const trimmed = email.trim();
    if (!trimmed) {
      reset();
      return { status: 'idle', reason: null, alsoExistingUser: false, checkedEmail: null };
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      requestIdRef.current += 1;
      const next: EmailCheckState = { status: 'error', reason: 'invalid_format', alsoExistingUser: false, checkedEmail: trimmed };
      setState(next);
      return next;
    }

    const myId = ++requestIdRef.current;
    setState({ status: 'checking', reason: null, alsoExistingUser: false, checkedEmail: trimmed });

    try {
      const { data, error } = await supabase.functions.invoke<CheckResponse>(
        'wisehire-waitlist-check-email',
        { body: { email: trimmed } },
      );

      if (myId !== requestIdRef.current) {
        return { status: 'idle', reason: null, alsoExistingUser: false, checkedEmail: trimmed };
      }

      let next: EmailCheckState;
      if (error || !data) {
        next = { status: 'error', reason: 'service_error', alsoExistingUser: false, checkedEmail: trimmed };
      } else if (!data.valid_format) {
        next = { status: 'error', reason: 'invalid_format', alsoExistingUser: false, checkedEmail: trimmed };
      } else if (data.is_consumer_domain) {
        next = {
          status: 'error',
          reason: 'consumer_domain',
          alsoExistingUser: data.existing_wiseresume_user === true,
          checkedEmail: trimmed,
        };
      } else if (data.existing_wiseresume_user) {
        next = { status: 'error', reason: 'existing_wiseresume_user', alsoExistingUser: false, checkedEmail: trimmed };
      } else if (data.already_on_waitlist) {
        next = { status: 'error', reason: 'already_on_waitlist', alsoExistingUser: false, checkedEmail: trimmed };
      } else {
        next = { status: 'ok', reason: null, alsoExistingUser: false, checkedEmail: trimmed };
      }
      setState(next);
      return next;
    } catch {
      if (myId !== requestIdRef.current) {
        return { status: 'idle', reason: null, alsoExistingUser: false, checkedEmail: trimmed };
      }
      const next: EmailCheckState = { status: 'error', reason: 'service_error', alsoExistingUser: false, checkedEmail: trimmed };
      setState(next);
      return next;
    }
  }, [reset]);

  const checkNow = useCallback((email: string): Promise<EmailCheckState> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return runCheck(email);
  }, [runCheck]);

  const checkDebounced = useCallback((email: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Optimistically mark as checking immediately so callers cannot bypass
    // validation by submitting during the debounce window.
    const trimmed = email.trim();
    if (trimmed) {
      requestIdRef.current += 1;
      setState({ status: 'checking', reason: null, alsoExistingUser: false, checkedEmail: trimmed });
    }
    debounceRef.current = setTimeout(() => {
      void runCheck(email);
    }, DEBOUNCE_MS);
  }, [runCheck]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { state, checkNow, checkDebounced, reset };
}
