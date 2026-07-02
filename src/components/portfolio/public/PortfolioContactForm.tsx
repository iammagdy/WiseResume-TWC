import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { appwriteFunctions } from '@/lib/appwrite-functions';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface PortfolioContactFormProps {
  username: string;
  accentColor: string;
  ownerName?: string | null;
}

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 4;

export function PortfolioContactForm({ username, accentColor, ownerName }: PortfolioContactFormProps) {
  const TURNSTILE_SITE_KEY = (import.meta.env as any)['VITE_TURNSTILE_SITE_KEY'] as string | undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot trap — visually hidden, never focused/seen by sighted users or
  // assistive tech.  Bots that fill every text input will populate this and
  // the server will silently succeed without sending the email.
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    TURNSTILE_SITE_KEY ? 'loading' : 'ready',
  );
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const isValid = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && message.trim().length >= MIN_MESSAGE_LENGTH;
  const isTurnstileReady = !TURNSTILE_SITE_KEY || !!turnstileToken;

  const submitBlockedReason = useMemo(() => {
    if (status === 'sending') return null;
    if (!name.trim()) return 'Enter your name to send.';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      return `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      if (turnstileStatus === 'error') return 'Security check failed. Please click retry.';
      return 'Checking security…';
    }
    return null;
  }, [status, name, email, message, turnstileToken, turnstileStatus]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
      if (turnstileWidgetIdRef.current) return;
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token: string) => {
          setTurnstileToken(token);
          setTurnstileStatus('ready');
          setErrorMsg('');
        },
        'expired-callback': () => {
          setTurnstileToken(null);
          setTurnstileStatus('loading');
          setErrorMsg('Security check expired. Please verify again.');
        },
        'error-callback': () => {
          setTurnstileToken(null);
          setTurnstileStatus('error');
          setErrorMsg('Security check failed. Please click retry.');
        },
      });
      setTurnstileStatus('loading');
    };
    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      if (!document.querySelector('script[src*="turnstile"]')) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
    const timeoutId = window.setTimeout(() => {
      setTurnstileStatus((current) => (current === 'loading' ? 'error' : current));
    }, 12_000);
    return () => {
      window.clearTimeout(timeoutId);
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !isTurnstileReady || status === 'sending') return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const body: Record<string, unknown> = {
        type: 'portfolio_contact',
        email: email.trim(),
        subject: `Portfolio message from ${name.trim()}`,
        message: message.trim(),
        website,
        metadata: {
          portfolio_username: username,
          visitor_name: name.trim(),
        },
      };
      if (turnstileToken) body.turnstileToken = turnstileToken;
      const { error } = await appwriteFunctions.invoke('send-contact-email', { body });

      if (!error) {
        setStatus('success');
        toast.success('Message sent! The portfolio owner will get back to you soon.');
      } else {
        const msg = error.message || 'Something went wrong. Please try again.';
        const friendlyMsg = msg.includes('Too many')
          ? 'Too many messages sent. Please wait a few minutes.'
          : /security check|captcha/i.test(msg)
            ? 'Security check failed. Please try again.'
            : msg;
        if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
          setTurnstileToken(null);
          setTurnstileStatus('loading');
        }
        setErrorMsg(friendlyMsg);
        setStatus('error');
        toast.error(friendlyMsg);
      }
    } catch {
      const netMsg = 'Network error — please check your connection and try again.';
      if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken(null);
        setTurnstileStatus('loading');
      }
      setErrorMsg(netMsg);
      setStatus('error');
      toast.error(netMsg);
    }
  }, [isValid, isTurnstileReady, status, email, name, message, username, website, turnstileToken]);

  if (status === 'success') {
    return (
      <motion.div
        role="status"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6 text-center space-y-3"
        style={{
          background: `color-mix(in srgb, ${accentColor} 8%, var(--pf-card, rgba(255,255,255,0.04)))`,
          border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
        }}
      >
        <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: accentColor }} />
        <p className="font-semibold text-[--pf-fg]">Message sent!</p>
        <p className="text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
          {ownerName ? `${ownerName} will` : 'The portfolio owner will'} get back to you soon.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-6 space-y-4"
      style={{
        background: 'var(--pf-card, rgba(255,255,255,0.04))',
        border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="space-y-0.5">
        <h3 className="font-semibold text-[--pf-fg]">Send a message</h3>
        <p className="text-xs" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
          Your message goes directly to {ownerName || 'the portfolio owner'} — no account needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Honeypot — visually hidden from sighted users and assistive tech.
            Bots that fill every text input will populate this and be silently
            rejected server-side.  `aria-hidden` + `tabIndex={-1}` keep it out
            of the keyboard tab order and the accessibility tree. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-10000px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          <label htmlFor="pf-contact-website">Website (leave blank)</label>
          <input
            id="pf-contact-website"
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="pf-contact-name" className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
              Your name
            </label>
            <input
              id="pf-contact-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--pf-input-bg, rgba(255,255,255,0.06))',
                border: '1px solid var(--pf-border, rgba(255,255,255,0.12))',
                color: 'var(--pf-fg, #f5f5ff)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`; e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pf-contact-email" className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
              Your email
            </label>
            <input
              id="pf-contact-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              maxLength={254}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: 'var(--pf-input-bg, rgba(255,255,255,0.06))',
                border: '1px solid var(--pf-border, rgba(255,255,255,0.12))',
                color: 'var(--pf-fg, #f5f5ff)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`; e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="pf-contact-message" className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
            Message
          </label>
          <textarea
            id="pf-contact-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Hi, I'd love to connect about…"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
            style={{
              background: 'var(--pf-input-bg, rgba(255,255,255,0.06))',
              border: '1px solid var(--pf-border, rgba(255,255,255,0.12))',
              color: 'var(--pf-fg, #f5f5ff)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`; e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accentColor} 22%, transparent)`; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <p className="text-[10px] text-right" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {message.length}/2000
          </p>
        </div>

        {status === 'error' && (
          <div role="alert" className="flex items-start gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
          </div>
        )}

        {TURNSTILE_SITE_KEY && (
          <div className="space-y-2">
            <div ref={turnstileContainerRef} className="flex justify-center min-h-[65px]" />
            {turnstileStatus === 'loading' && (
              <p className="text-[11px] text-center animate-pulse" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                Checking security…
              </p>
            )}
            {turnstileStatus === 'error' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] text-center text-amber-400">
                  Security check failed. Please try again.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    if (window.turnstile && turnstileWidgetIdRef.current) {
                      window.turnstile.reset(turnstileWidgetIdRef.current);
                      setTurnstileToken(null);
                      setTurnstileStatus('loading');
                      setErrorMsg('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg border-white/20 hover:bg-white/5 text-[--pf-fg]"
                >
                  Retry security check
                </Button>
              </div>
            )}
          </div>
        )}

        {submitBlockedReason && (
          <p className="text-[11px] text-center" style={{ color: 'var(--pf-muted, #9ca3af)' }} role="status">
            {submitBlockedReason}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || !isTurnstileReady || status === 'sending'}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: accentColor }}
        >
          {status === 'sending' ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send message
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
