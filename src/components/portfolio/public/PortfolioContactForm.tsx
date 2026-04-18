import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PortfolioContactFormProps {
  username: string;
  accentColor: string;
  ownerName?: string | null;
}

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PortfolioContactForm({ username, accentColor, ownerName }: PortfolioContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isValid = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && message.trim().length >= 10;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || status === 'sending') return;

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/fn/submit-contact-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'portfolio_contact',
          email: email.trim(),
          subject: `Portfolio message from ${name.trim()}`,
          message: message.trim(),
          metadata: {
            portfolio_username: username,
            visitor_name: name.trim(),
          },
        }),
      });

      if (res.ok) {
        setStatus('success');
        toast.success('Message sent! The portfolio owner will get back to you soon.');
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error || 'Something went wrong. Please try again.';
        const friendlyMsg = msg.includes('Too many') ? 'Too many messages sent. Please wait a few minutes.' : msg;
        setErrorMsg(friendlyMsg);
        setStatus('error');
        toast.error(friendlyMsg);
      }
    } catch {
      const netMsg = 'Network error — please check your connection and try again.';
      setErrorMsg(netMsg);
      setStatus('error');
      toast.error(netMsg);
    }
  }, [isValid, status, email, name, message, username]);

  if (status === 'success') {
    return (
      <motion.div
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
              Your name
            </label>
            <input
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
              onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
              Your email
            </label>
            <input
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
              onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`)}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))')}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
            Message
          </label>
          <textarea
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
            onFocus={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, transparent)`)}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--pf-border, rgba(255,255,255,0.12))')}
          />
          <p className="text-[10px] text-right" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
            {message.length}/2000
          </p>
        </div>

        {status === 'error' && (
          <div className="flex items-start gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || status === 'sending'}
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
