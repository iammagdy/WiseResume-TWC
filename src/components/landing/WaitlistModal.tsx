import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Loader2, Briefcase, Mail, Building2, Users, KeyRound, ArrowLeft } from 'lucide-react';
import { useWaitlist } from '@/hooks/wisehire/useWaitlist';
import { validateEarlyAccessCode } from '@/lib/wisehire/inviteTokenClient';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–1,000 employees',
  '1,000+ employees',
];

type ModalView = 'waitlist' | 'early_access';

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', company: '', email: '', size: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [view, setView] = useState<ModalView>('waitlist');
  const [eaCode, setEaCode] = useState('');
  const [eaEmail, setEaEmail] = useState('');
  const [eaError, setEaError] = useState('');
  const [eaLoading, setEaLoading] = useState(false);

  const { mutate, isPending, isSuccess, reset: resetMutation } = useWaitlist();

  if (!open) return null;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.company.trim()) e.company = 'Company is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.size) e.size = 'Please select your company size';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError('');
    mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        company_name: form.company.trim(),
        company_size: form.size,
      },
      {
        onSuccess: (data) => {
          if (data.already_registered) setAlreadyRegistered(true);
        },
        onError: (err) => {
          setSubmitError(err.message || 'Something went wrong. Please try again.');
        },
      }
    );
  };

  const handleEarlyAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEaError('');

    const trimCode = eaCode.trim().toUpperCase();
    const trimEmail = eaEmail.trim();

    if (!trimCode) { setEaError('Please enter your early access code.'); return; }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setEaError('Please enter a valid work email.');
      return;
    }

    setEaLoading(true);
    const result = await validateEarlyAccessCode(trimCode);
    setEaLoading(false);

    if (!result.valid) {
      setEaError(result.error);
      return;
    }

    handleClose();
    navigate(`/wisehire/signup-early-access/${encodeURIComponent(trimCode)}?email=${encodeURIComponent(trimEmail)}`);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setForm({ name: '', company: '', email: '', size: '' });
      setErrors({});
      setAlreadyRegistered(false);
      setSubmitError('');
      resetMutation();
      setView('waitlist');
      setEaCode('');
      setEaEmail('');
      setEaError('');
    }, 300);
  };

  const fieldStyle = (err?: string): React.CSSProperties => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${err ? '#ef4444' : 'var(--lp-border-card)'}`,
    background: 'var(--lp-card-glass)',
    color: 'var(--lp-text)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  });

  const submitted = isSuccess;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join the WiseHire waitlist"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          borderRadius: 20,
          background: 'var(--lp-card)',
          border: '1px solid var(--lp-border-card)',
          padding: '32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Close waitlist modal"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--lp-border)',
            background: 'var(--lp-card-glass)',
            color: 'var(--lp-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Success state ── */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(29,78,216,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: '#3B82F6' }} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--lp-text)',
                marginBottom: 10,
                letterSpacing: '-0.02em',
              }}
            >
              {alreadyRegistered ? "You're already on the list!" : "You're on the list!"}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--lp-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              {alreadyRegistered
                ? "We already have your details. We'll reach out when your invite is ready."
                : "We'll be in touch when your invite is ready. Check your inbox for a confirmation."}
            </p>
            <button
              onClick={handleClose}
              style={{
                background: '#1D4ED8',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 28px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>

        ) : view === 'early_access' ? (
          /* ── Early access code view ── */
          <>
            <button
              type="button"
              onClick={() => { setView('waitlist'); setEaError(''); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                color: 'var(--lp-text-muted)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                marginBottom: 20,
                padding: 0,
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to waitlist
            </button>

            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(29,78,216,0.10)',
                  border: '1px solid rgba(29,78,216,0.22)',
                  borderRadius: 99,
                  padding: '4px 12px',
                  marginBottom: 14,
                }}
              >
                <KeyRound className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3B82F6' }}>Early Access</span>
              </div>
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--lp-text)',
                  letterSpacing: '-0.025em',
                  marginBottom: 6,
                }}
              >
                Enter your early access code
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
                Got a code? Skip the waitlist and set up your WiseHire account right now.
              </p>
            </div>

            <form onSubmit={handleEarlyAccessSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Mail className="w-3.5 h-3.5" /> Work Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={eaEmail}
                  onChange={(e) => setEaEmail(e.target.value)}
                  style={fieldStyle()}
                  disabled={eaLoading}
                  onFocus={(ev) => { (ev.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(ev) => { (ev.target as HTMLInputElement).style.borderColor = 'var(--lp-border-card)'; }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <KeyRound className="w-3.5 h-3.5" /> Early Access Code
                </label>
                <input
                  type="text"
                  placeholder="WISE-XXXX"
                  value={eaCode}
                  onChange={(e) => setEaCode(e.target.value.toUpperCase())}
                  style={{ ...fieldStyle(), fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  disabled={eaLoading}
                  autoComplete="off"
                  onFocus={(ev) => { (ev.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(ev) => { (ev.target as HTMLInputElement).style.borderColor = 'var(--lp-border-card)'; }}
                />
              </div>

              {eaError && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: -6 }}>{eaError}</p>
              )}

              <button
                type="submit"
                disabled={eaLoading}
                style={{
                  marginTop: 4,
                  background: eaLoading ? '#fff' : '#1D4ED8',
                  color: eaLoading ? '#1D4ED8' : '#fff',
                  border: eaLoading ? '2px solid #1D4ED8' : 'none',
                  borderRadius: 10,
                  padding: eaLoading ? '9px 0' : '11px 0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: eaLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s, color 0.2s, border 0.2s',
                }}
              >
                {eaLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" style={{ color: '#1D4ED8' }} /> Verifying…</>
                  : 'Continue with Early Access'
                }
              </button>
            </form>
          </>

        ) : (
          /* ── Waitlist form ── */
          <>
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(29,78,216,0.10)',
                  border: '1px solid rgba(29,78,216,0.22)',
                  borderRadius: 99,
                  padding: '4px 12px',
                  marginBottom: 14,
                }}
              >
                <Briefcase className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3B82F6' }}>WiseHire — Early Access</span>
              </div>
              <h2
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--lp-text)',
                  letterSpacing: '-0.025em',
                  marginBottom: 6,
                }}
              >
                Join the waitlist
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
                Be first to access AI-powered hiring tools. No spam — we'll only reach out with your invite.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Mail className="w-3.5 h-3.5" /> Work Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={fieldStyle(errors.email)}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.email ? '#ef4444' : 'var(--lp-border-card)'; }}
                />
                {errors.email && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.email}</p>}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Users className="w-3.5 h-3.5" /> Your Name
                </label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={fieldStyle(errors.name)}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.name ? '#ef4444' : 'var(--lp-border-card)'; }}
                />
                {errors.name && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.name}</p>}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Building2 className="w-3.5 h-3.5" /> Company Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  style={fieldStyle(errors.company)}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.company ? '#ef4444' : 'var(--lp-border-card)'; }}
                />
                {errors.company && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.company}</p>}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Users className="w-3.5 h-3.5" /> Company Size
                </label>
                <select
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  style={{ ...fieldStyle(errors.size), appearance: 'auto' }}
                  onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = '#1D4ED8'; }}
                  onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = errors.size ? '#ef4444' : 'var(--lp-border-card)'; }}
                >
                  <option value="">Select company size…</option>
                  {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.size && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.size}</p>}
              </div>

              <button
                type="submit"
                disabled={isPending}
                style={{
                  marginTop: 4,
                  background: isPending ? '#fff' : '#1D4ED8',
                  color: isPending ? '#1D4ED8' : '#fff',
                  border: isPending ? '2px solid #1D4ED8' : 'none',
                  borderRadius: 10,
                  padding: isPending ? '9px 0' : '11px 0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s, color 0.2s, border 0.2s',
                }}
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" style={{ color: '#1D4ED8' }} /> Joining…</>
                  : 'Join the Waitlist'
                }
              </button>

              {submitError && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: -4 }}>{submitError}</p>
              )}

              <p style={{ fontSize: '0.68rem', color: 'var(--lp-text-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
                No spam. No credit card. Invite-only early access.
              </p>

              <button
                type="button"
                onClick={() => { setView('early_access'); setEaError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--lp-text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  marginTop: -4,
                }}
              >
                Already have an early access code?
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
