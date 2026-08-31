import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, type DepartmentValue } from '@/components/settings/ContactInquiryDialog';
import { useLocale } from '@/i18n/LocaleProvider';
import { legalContent } from '@/i18n/legalContent';

export function LocalizedLegalPage({ kind }: { kind: 'privacy' | 'terms' | 'refund' }) {
  const { locale, t } = useLocale();
  const content = legalContent[locale][kind];
  const isRtl = locale === 'ar';
  const [contactOpen, setContactOpen] = useState(false);
  const [department, setDepartment] = useState<DepartmentValue>(
    kind === 'privacy' ? 'privacy' : kind === 'refund' ? 'general' : 'legal'
  );
  const contactRef = useRef<HTMLElement>(null);
  const Icon = kind === 'privacy' ? ShieldCheck : kind === 'terms' ? FileText : RotateCcw;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const home = isRtl ? '/ar' : '/';

  useEffect(() => {
    document.title = `${content.title} — WiseResume`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', content.intro);
    }
  }, [content.title, content.intro]);

  const openContact = (next: DepartmentValue) => {
    setDepartment(next);
    contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    setContactOpen(true);
  };

  const privacyPath = isRtl ? '/ar/privacy' : '/privacy';
  const termsPath = isRtl ? '/ar/terms' : '/terms';
  const refundPath = isRtl ? '/ar/refund-policy' : '/refund-policy';

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isRtl ? 'rtl' : 'ltr'} lang={locale}>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center gap-3">
        <Link to={home}>
          <Button variant="ghost" size="icon" className="w-9 h-9" aria-label={content.backLabel}>
            <BackIcon className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold text-foreground">{content.title}</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <article className="rounded-2xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-foreground">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Icon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">{content.title}</h2>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">{content.effectiveDate}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{content.intro}</p>

          {content.sections.map((section, index) => (
            <section className="space-y-3" key={section.title}>
              <h3 className="text-foreground font-semibold flex items-center gap-2 text-base">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                {section.title}
              </h3>
              <div className="space-y-3 ps-8 border-s border-border text-muted-foreground">
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="leading-relaxed">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc ps-5 space-y-2">
                    {section.bullets.map((item) => (
                      <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

          <section ref={contactRef} className="pt-8 border-t border-border">
            <h3 className="font-semibold text-base mb-2">{content.contactTitle}</h3>
            <p className="text-muted-foreground">{content.contactText}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => openContact(kind === 'privacy' ? 'privacy' : kind === 'refund' ? 'general' : 'legal')}
                variant="outline"
                className="rounded-full h-11 px-6"
              >
                {content.primaryContact}
              </Button>
              <Button
                onClick={() => openContact(kind === 'privacy' ? 'data-protection' : 'general')}
                variant="ghost"
                className="rounded-full h-11 px-6 text-muted-foreground"
              >
                {content.secondaryContact}
              </Button>
            </div>
          </section>

          <footer className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>&copy; 2026 WiseResume &mdash; The Wise Cloud</span>
            <div className="flex items-center gap-3">
              {kind !== 'terms' && (
                <Link to={termsPath} className="hover:text-foreground underline underline-offset-4">
                  {t('landing.termsOfService', 'Terms of Service')}
                </Link>
              )}
              {kind !== 'privacy' && (
                <Link to={privacyPath} className="hover:text-foreground underline underline-offset-4">
                  {t('landing.privacyPolicy', 'Privacy Policy')}
                </Link>
              )}
              {kind !== 'refund' && (
                <Link to={refundPath} className="hover:text-foreground underline underline-offset-4">
                  {t('landing.refundPolicy', 'Refund Policy')}
                </Link>
              )}
            </div>
          </footer>
        </article>
      </main>

      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} defaultDepartment={department} />
    </div>
  );
}
