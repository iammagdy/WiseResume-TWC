import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Loader2, Mail, Building2, Users, Briefcase, ArrowLeft, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWaitlist } from '@/hooks/wisehire/useWaitlist';

const COMPANY_SIZES = [
  '1–10',
  '11–50',
  '51–200',
  '201–1,000',
  '1,000+',
];

export default function WaitlistPage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', size: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const { mutate, isPending, isSuccess } = useWaitlist();

  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);
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
      }
    );
  };

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${err ? '#ef4444' : '#e2e8f0'}`,
    background: '#fff',
    color: '#0f172a',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <Link
          to="/?for=companies"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#1D4ED8', textDecoration: 'none', marginBottom: 28, fontWeight: 500 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to WiseHire
        </Link>

        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '40px 36px',
          boxShadow: '0 4px 32px rgba(29,78,216,0.10)',
          border: '1px solid #e2e8f0',
        }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(29,78,216,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: '#1D4ED8' }} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.03em' }}>
                {alreadyRegistered ? "You're already on the list!" : "You're on the list!"}
              </h1>
              <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.65, marginBottom: 32 }}>
                {alreadyRegistered
                  ? "We already have your details. We'll reach out when your invite is ready."
                  : "Thanks for joining. We'll be in touch with your invite — check your inbox for a confirmation email."}
              </p>
              <Link
                to="/?for=companies"
                style={{
                  display: 'inline-block',
                  background: '#1D4ED8',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '11px 28px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Back to WiseHire
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(29,78,216,0.08)',
                  border: '1px solid rgba(29,78,216,0.2)',
                  borderRadius: 99,
                  padding: '4px 12px',
                  marginBottom: 16,
                }}>
                  <Briefcase className="w-3.5 h-3.5" style={{ color: '#1D4ED8' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1D4ED8' }}>WiseHire — Early Access</span>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.03em' }}>
                  Join the waitlist
                </h1>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                  Be among the first to hire smarter with AI. No spam — only your invite.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    <Mail className="w-3.5 h-3.5" /> Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={inputStyle(errors.email)}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.email ? '#ef4444' : '#e2e8f0'; }}
                  />
                  {errors.email && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>{errors.email}</p>}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    <Users className="w-3.5 h-3.5" /> Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle(errors.name)}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.name ? '#ef4444' : '#e2e8f0'; }}
                  />
                  {errors.name && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>{errors.name}</p>}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    <Building2 className="w-3.5 h-3.5" /> Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    style={inputStyle(errors.company)}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#1D4ED8'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = errors.company ? '#ef4444' : '#e2e8f0'; }}
                  />
                  {errors.company && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>{errors.company}</p>}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    <Users className="w-3.5 h-3.5" /> Company Size
                  </label>
                  <div ref={sizeRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setSizeOpen((o) => !o)}
                      style={{
                        ...inputStyle(errors.size),
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: form.size ? '#0f172a' : '#94a3b8' }}>
                        {form.size || 'Select company size…'}
                      </span>
                      <ChevronDown
                        className="w-4 h-4"
                        style={{
                          color: '#94a3b8',
                          flexShrink: 0,
                          transform: sizeOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                    {sizeOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 300,
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          overflow: 'hidden',
                        }}
                      >
                        {COMPANY_SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
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
                              color: s === form.size ? '#1D4ED8' : '#0f172a',
                              background: s === form.size ? '#eff6ff' : 'transparent',
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
                  {errors.size && <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>{errors.size}</p>}
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
                    padding: isPending ? '10px 0' : '12px 0',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    transition: 'background 0.2s, color 0.2s, border 0.2s',
                  }}
                >
                  {isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" style={{ color: '#1D4ED8' }} /> Joining…</>
                    : 'Join the Waitlist'
                  }
                </button>

                <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                  No spam. No credit card. Invite-only early access.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
