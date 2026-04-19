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
  checkedEmail: string | null;
}

interface CheckResponse {
  valid_format: boolean;
  is_consumer_domain: boolean;
  existing_wiseresume_user: boolean;
  already_on_waitlist: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONSUMER_DOMAINS = new Set([
  'gmail.com','googlemail.com',
  'yahoo.com','yahoo.co.uk','yahoo.co.in','yahoo.fr','yahoo.de','yahoo.es',
  'yahoo.it','yahoo.com.au','yahoo.com.br','yahoo.ca','yahoo.com.mx','yahoo.com.ar',
  'ymail.com',
  'hotmail.com','hotmail.co.uk','hotmail.fr','hotmail.de','hotmail.es',
  'hotmail.it','hotmail.com.br','hotmail.com.ar','hotmail.com.mx',
  'outlook.com','outlook.co.uk','outlook.fr','outlook.de','outlook.es','outlook.it',
  'live.com','live.co.uk','live.fr','live.de',
  'icloud.com','me.com','mac.com',
  'aol.com','aim.com',
  'mail.com','email.com',
  'protonmail.com','proton.me',
  'gmx.com','gmx.de','gmx.net',
  'web.de','t-online.de',
  'comcast.net','verizon.net','att.net','sbcglobal.net','cox.net','charter.net',
  'earthlink.net','optonline.net',
  'qq.com','163.com','126.com','sina.com',
  'naver.com','hanmail.net','daum.net',
]);

const DEBOUNCE_MS = 400;

export function useWaitlistEmailCheck() {
  const [state, setState] = useState<EmailCheckState>({
    status: 'idle',
    reason: null,
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
    setState({ status: 'idle', reason: null, checkedEmail: null });
  }, []);

  const runCheck = useCallback(async (email: string): Promise<EmailCheckState> => {
    const trimmed = email.trim();
    if (!trimmed) {
      reset();
      return { status: 'idle', reason: null, checkedEmail: null };
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      requestIdRef.current += 1;
      const next: EmailCheckState = { status: 'error', reason: 'invalid_format', checkedEmail: trimmed };
      setState(next);
      return next;
    }

    const domain = trimmed.toLowerCase().split('@')[1] ?? '';
    if (CONSUMER_DOMAINS.has(domain)) {
      requestIdRef.current += 1;
      const next: EmailCheckState = { status: 'error', reason: 'consumer_domain', checkedEmail: trimmed };
      setState(next);
      return next;
    }

    const myId = ++requestIdRef.current;
    setState({ status: 'checking', reason: null, checkedEmail: trimmed });

    try {
      const { data, error } = await supabase.functions.invoke<CheckResponse>(
        'wisehire-waitlist-check-email',
        { body: { email: trimmed } },
      );

      if (myId !== requestIdRef.current) {
        return { status: 'idle', reason: null, checkedEmail: trimmed };
      }

      let next: EmailCheckState;
      if (error || !data) {
        next = { status: 'error', reason: 'service_error', checkedEmail: trimmed };
      } else if (!data.valid_format) {
        next = { status: 'error', reason: 'invalid_format', checkedEmail: trimmed };
      } else if (data.is_consumer_domain) {
        next = { status: 'error', reason: 'consumer_domain', checkedEmail: trimmed };
      } else if (data.existing_wiseresume_user) {
        next = { status: 'error', reason: 'existing_wiseresume_user', checkedEmail: trimmed };
      } else if (data.already_on_waitlist) {
        next = { status: 'error', reason: 'already_on_waitlist', checkedEmail: trimmed };
      } else {
        next = { status: 'ok', reason: null, checkedEmail: trimmed };
      }
      setState(next);
      return next;
    } catch {
      if (myId !== requestIdRef.current) {
        return { status: 'idle', reason: null, checkedEmail: trimmed };
      }
      const next: EmailCheckState = { status: 'error', reason: 'service_error', checkedEmail: trimmed };
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
      setState({ status: 'checking', reason: null, checkedEmail: trimmed });
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
