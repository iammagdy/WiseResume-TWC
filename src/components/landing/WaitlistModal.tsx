import { useState, useRef, useEffect } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Briefcase, Mail, Building2, Users, KeyRound, ArrowLeft, ChevronDown } from 'lucide-react';
import { useWaitlist } from '@/hooks/wisehire/useWaitlist';
import { useWaitlistEmailCheck } from '@/hooks/wisehire/useWaitlistEmailCheck';
import { validateEarlyAccessCode } from '@/lib/wisehire/inviteTokenClient';
import { useLocale } from '@/i18n/LocaleProvider';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const COMPANY_SIZES = [
  '1–10',
  '11–50',
  '51–200',
  '201–1,000',
  '1,000+',
];

type ModalView = 'waitlist' | 'early_access';

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const navigate = useNavigate();
  const { t, locale } = useLocale();

  const [form, setForm] = useState({ name: '', company: '', email: '', size: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingWiseResumeUser, setExistingWiseResumeUser] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [view, setView] = useState<ModalView>('waitlist');
  const [eaCode, setEaCode] = useState('');
  const [eaEmail, setEaEmail] = useState('');
  const [eaError, setEaError] = useState('');
  const [eaLoading, setEaLoading] = useState(false);

  const { mutate, isPending, isSuccess, reset: resetMutation } = useWaitlist();
  const { state: emailCheck, checkNow: checkEmailNow, checkDebounced: checkEmailDebounced, reset: resetEmailCheck } = useWaitlistEmailCheck();
  const emailHasBlurredRef = useRef(false);

  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) setSizeOpen(false);
  }, [open]);
  useEffect(() => {
    if (!sizeOpen) return;
    const handler = (e: MouseEvent) => {
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) {
        setSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sizeOpen]);

  if (!open) return null;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = t('landing.waitlistModal.nameRequired', 'Name is required');
    if (!form.company.trim()) e.company = t('landing.waitlistModal.companyRequired', 'Company is required');
    if (!form.email.trim()) {
      e.email = t('landing.waitlistModal.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = t('landing.waitlistModal.validEmail', 'Enter a valid email');
    }
    if (!form.size) e.size = t('landing.waitlistModal.selectCompanySize', 'Please select your company size');
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError('');

    // Defense in depth: ensure the live email check has completed before
    // submit, even if the user clicked during the debounce window. This
    // forces a synchronous check and bails out if the result is known-bad.
    const finalCheck = await checkEmailNow(form.email);
    if (
      finalCheck.status === 'error' &&
      finalCheck.reason !== null &&
      finalCheck.reason !== 'service_error'
    ) {
      // Known-bad result: surface it inline; the server will still reject
      // anyway, but no point sending a doomed request.
      return;
    }

    mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        company_name: form.company.trim(),
        company_size: form.size,
      },
      {
        onSuccess: (data) => {
          if (data.existing_wiseresume_user) setExistingWiseResumeUser(true);
          else if (data.already_registered) setAlreadyRegistered(true);
        },
        onError: (err) => {
          setSubmitError(err.message || t('landing.waitlistModal.somethingWentWrong', 'Something went wrong. Please try again.'));
        },
      }
    );
  };

  const handleEarlyAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEaError('');

    const trimCode = eaCode.trim().toUpperCase();
    const trimEmail = eaEmail.trim();

    if (!trimCode) { setEaError(t('landing.waitlistModal.enterEaCode', 'Please enter your early access code.')); return; }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setEaError(t('landing.waitlistModal.enterEaEmail', 'Please enter a valid work email.'));
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
      setExistingWiseResumeUser(false);
      setSubmitError('');
      resetMutation();
      resetEmailCheck();
      emailHasBlurredRef.current = false;
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

  const emailMatchesChecked =
    emailCheck.checkedEmail !== null &&
    emailCheck.checkedEmail.trim().toLowerCase() === form.email.trim().toLowerCase();
  const hasEmailCheckError = emailMatchesChecked && emailCheck.status === 'error';
  const hasKnownBadEmail =
    hasEmailCheckError &&
    emailCheck.reason !== null &&
    emailCheck.reason !== 'service_error';
  const emailCheckMessage: { text: string; tone: 'error' | 'info' } | null = (() => {
    if (!emailMatchesChecked || emailCheck.status !== 'error') return null;
    switch (emailCheck.reason) {
      case 'invalid_format':
        return { text: t('landing.waitlistModal.validEmail', 'Enter a valid email'), tone: 'error' };
      case 'consumer_domain':
        return { text: t('landing.waitlistModal.workEmailRequired', 'Please use a work email address.'), tone: 'error' };
      case 'existing_wiseresume_user':
        return { text: t('landing.waitlistModal.emailUsedWiseResume', 'This email is already used in WiseResume.'), tone: 'info' };
      case 'already_on_waitlist':
        return { text: t('landing.waitlistModal.alreadyOnWaitlist', "You're already on the waitlist — we'll be in touch when your invite is ready."), tone: 'info' };
      case 'service_error':
        return { text: t('landing.waitlistModal.couldNotCheckEmail', 'Could not check this email. Please try again.'), tone: 'error' };
      default:
        return null;
    }
  })();
  const showAlsoExistingUserNote =
    emailMatchesChecked &&
    emailCheck.reason === 'consumer_domain' &&
    emailCheck.alsoExistingUser;
  const isCheckingEmail = emailCheck.status === 'checking';
  const joinDisabled = isPending || isCheckingEmail || hasKnownBadEmail;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('landing.waitlistModal.joinWaitlistAria', 'Join the WiseHire waitlist')}
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
          aria-label={t('landing.waitlistModal.closeWaitlistAria', 'Close waitlist modal')}
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
              {existingWiseResumeUser
                ? t('landing.waitlistModal.alreadyRegisteredWiseResume', 'Already registered on WiseResume')
                : alreadyRegistered
                ? t('landing.waitlistModal.alreadyOnListSuccess', "You're already on the list!")
                : t('landing.waitlistModal.onListSuccess', "You're on the list!")}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--lp-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              {existingWiseResumeUser
                ? t('landing.waitlistModal.alreadyRegisteredWiseResumeDesc', 'This email is already registered on WiseResume. Sign in instead — WiseHire access is managed from your account.')
                : alreadyRegistered
                ? t('landing.waitlistModal.alreadyOnListSuccessDesc', "We already have your details. We'll reach out when your invite is ready.")
                : t('landing.waitlistModal.onListSuccessDesc', "We'll be in touch when your invite is ready. Check your inbox for a confirmation.")}
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
              {t('common.close', 'Close')}
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
              <ArrowLeft className="w-3.5 h-3.5" style={{ transform: locale === 'ar' ? 'rotate(180deg)' : undefined }} /> {t('landing.waitlistModal.backToWaitlist', 'Back to waitlist')}
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
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3B82F6' }}>{t('landing.waitlistModal.earlyAccessBadge', 'Early Access')}</span>
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
                {t('landing.waitlistModal.enterEaCodeTitle', 'Enter your early access code')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
                {t('landing.waitlistModal.enterEaCodeDesc', 'Got a code? Skip the waitlist and set up your WiseHire account right now.')}
              </p>
            </div>

            <form onSubmit={handleEarlyAccessSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Mail className="w-3.5 h-3.5" /> {t('landing.waitlistModal.workEmailLabel', 'Work Email')}
                </label>
                <input
                  type="email"
                  placeholder={t('landing.waitlistModal.workEmailPlaceholder', 'you@company.com')}
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
                  <KeyRound className="w-3.5 h-3.5" /> {t('landing.waitlistModal.earlyAccessCodeLabel', 'Early Access Code')}
                </label>
                <input
                  type="text"
                  placeholder={t('landing.waitlistModal.eaCodePlaceholder', 'WISE-XXXX')}
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
                  ? <><MiniSpinner size={16} /> {t('landing.waitlistModal.verifying', 'Verifying…')}</>
                  : t('landing.waitlistModal.continueEarlyAccess', 'Continue with Early Access')
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
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#3B82F6' }}>{t('landing.waitlistModal.wisehireEaBadge', 'WiseHire — Early Access')}</span>
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
                {t('landing.waitlistModal.joinWaitlistTitle', 'Join the waitlist')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', lineHeight: 1.5 }}>
                {t('landing.waitlistModal.joinWaitlistDesc', "Be first to access AI-powered hiring tools. No spam — we'll only reach out with your invite.")}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Mail className="w-3.5 h-3.5" /> {t('landing.waitlistModal.workEmailLabel', 'Work Email')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    placeholder={t('landing.waitlistModal.workEmailPlaceholder', 'you@company.com')}
                    value={form.email}
                    onChange={(e) => {
                      const next = e.target.value;
                      setForm((f) => ({ ...f, email: next }));
                      if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                      resetEmailCheck();
                      if (emailHasBlurredRef.current) {
                        checkEmailDebounced(next);
                      }
                    }}
                    style={{
                      ...fieldStyle(errors.email || hasKnownBadEmail),
                      ...(isCheckingEmail ? { paddingRight: 36 } : null),
                    }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = (errors.email || hasKnownBadEmail) ? '#ef4444' : 'var(--lp-border-card)';
                      emailHasBlurredRef.current = true;
                      void checkEmailNow(form.email);
                    }}
                  />
                  {emailCheck.status === 'checking' && (
                    <MiniSpinner size={16} />
                  )}
                </div>
                {errors.email && (
                  <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.email}</p>
                )}
                {!errors.email && emailCheckMessage && (
                  <p style={{ fontSize: '0.7rem', color: emailCheckMessage.tone === 'error' ? '#ef4444' : 'var(--lp-text-muted)', marginTop: 3 }}>
                    {emailCheckMessage.text}
                    {emailCheck.reason === 'existing_wiseresume_user' && (
                      <>
                        {' '}
                        <a
                          href="/sign-in?mode=login"
                          onClick={(e) => {
                            e.preventDefault();
                            handleClose();
                            navigate('/sign-in?mode=login');
                          }}
                          style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {t('landing.waitlistModal.signInInstead', 'Sign in instead')}
                        </a>
                        .
                      </>
                    )}
                  </p>
                )}
                {!errors.email && showAlsoExistingUserNote && (
                  <p style={{ fontSize: '0.7rem', color: '#3B82F6', marginTop: 2 }}>
                    {t('landing.waitlistModal.existingUserNote', 'This email is already signed up on WiseResume.')}{' '}
                    <a
                      href="/sign-in?mode=login"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate('/sign-in?mode=login');
                      }}
                      style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {t('landing.waitlistModal.signInInstead', 'Sign in instead')}
                    </a>
                    .
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--lp-text-muted)', marginBottom: 5 }}>
                  <Users className="w-3.5 h-3.5" /> {t('landing.waitlistModal.yourNameLabel', 'Your Name')}
                </label>
                <input
                  type="text"
                  placeholder={t('landing.waitlistModal.namePlaceholder', 'Jane Smith')}
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
                  <Building2 className="w-3.5 h-3.5" /> {t('landing.waitlistModal.companyNameLabel', 'Company Name')}
                </label>
                <input
                  type="text"
                  placeholder={t('landing.waitlistModal.companyNamePlaceholder', 'Acme Corp')}
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
                  <Users className="w-3.5 h-3.5" /> {t('landing.waitlistModal.companySizeLabel', 'Company Size')}
                </label>
                <div ref={sizeRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={sizeOpen}
                    aria-label={t('landing.waitlistModal.companySizeAria', 'Company size')}
                    onClick={() => setSizeOpen((o) => !o)}
                    style={{
                      ...fieldStyle(errors.size),
                      textAlign: locale === 'ar' ? 'right' : 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: form.size ? 'inherit' : 'var(--lp-text-muted)' }}>
                      {form.size || t('landing.waitlistModal.selectCompanySizePlaceholder', 'Select company size…')}
                    </span>
                    <ChevronDown
                      className="w-4 h-4"
                      style={{
                        color: 'var(--lp-text-muted)',
                        flexShrink: 0,
                        transform: sizeOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                  {sizeOpen && (
                    <div
                      role="listbox"
                      aria-label={t('landing.waitlistModal.companySizeOptionsAria', 'Company size options')}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 300,
                        borderRadius: 10,
                        border: '1px solid var(--lp-border-card)',
                        background: 'var(--lp-card)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                        overflow: 'hidden',
                      }}
                    >
                      {COMPANY_SIZES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="option"
                          aria-selected={s === form.size}
                          onClick={() => {
                            setForm((f) => ({ ...f, size: s }));
                            setSizeOpen(false);
                            if (errors.size) setErrors((e) => ({ ...e, size: undefined }));
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '9px 13px',
                            fontSize: '0.875rem',
                            color: s === form.size ? '#3B82F6' : 'var(--lp-text)',
                            background: s === form.size ? 'rgba(29,78,216,0.1)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.size && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 3 }}>{errors.size}</p>}
              </div>

              <button
                type="submit"
                disabled={joinDisabled}
                style={{
                  marginTop: 4,
                  background: isPending ? '#fff' : '#1D4ED8',
                  color: isPending ? '#1D4ED8' : '#fff',
                  border: isPending ? '2px solid #1D4ED8' : 'none',
                  borderRadius: 10,
                  padding: isPending ? '9px 0' : '11px 0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: joinDisabled ? 'not-allowed' : 'pointer',
                  opacity: !isPending && joinDisabled ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s, color 0.2s, border 0.2s, opacity 0.2s',
                }}
              >
                {isPending
                  ? <><MiniSpinner size={16} /> {t('landing.waitlistModal.joining', 'Joining…')}</>
                  : isCheckingEmail
                  ? t('landing.waitlistModal.checkingEmail', 'Checking email…')
                  : t('landing.waitlistModal.joinWaitlistButton', 'Join the Waitlist')
                }
              </button>

              {submitError && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: -4 }}>{submitError}</p>
              )}

              <p style={{ fontSize: '0.68rem', color: 'var(--lp-text-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
                {t('landing.waitlistModal.noSpamNote', 'No spam. No credit card. Invite-only early access.')}
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
                {t('landing.waitlistModal.alreadyHaveEaCode', 'Already have an early access code?')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
