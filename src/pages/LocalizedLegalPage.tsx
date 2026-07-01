import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, type DepartmentValue } from '@/components/settings/ContactInquiryDialog';
import { useLocale } from '@/i18n/LocaleProvider';
import { legalContent } from '@/i18n/legalContent';

export function LocalizedLegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { locale } = useLocale();
  const content = legalContent[locale][kind];
  const isRtl = locale === 'ar';
  const [contactOpen, setContactOpen] = useState(false);
  const [department, setDepartment] = useState<DepartmentValue>(kind === 'privacy' ? 'privacy' : 'legal');
  const contactRef = useRef<HTMLElement>(null);
  const Icon = kind === 'privacy' ? ShieldCheck : FileText;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const home = isRtl ? '/ar' : '/';

  const openContact = (next: DepartmentValue) => {
    setDepartment(next);
    contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    setContactOpen(true);
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'} lang={locale}>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center gap-3">
        <Link to={home}>
          <Button variant="ghost" size="icon" className="w-9 h-9" aria-label={content.backLabel}><BackIcon className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-sm font-semibold text-foreground">{content.title}</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <article className="rounded-2xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-foreground">
          <div className="flex items-center gap-2 pb-3 border-b border-border"><Icon className="w-5 h-5 text-primary" /><h2 className="text-lg font-bold">{content.title}</h2></div>
          <p className="text-[10px] text-muted-foreground font-medium">{content.effectiveDate}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{content.intro}</p>
          {content.sections.map((section, index) => (
            <section className="space-y-3" key={section.title}>
              <h3 className="text-foreground font-semibold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">{index + 1}</span>{section.title}</h3>
              <div className="space-y-3 ps-8 border-s border-border text-muted-foreground">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul className="list-disc ps-5 space-y-1">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
              </div>
            </section>
          ))}
          <section ref={contactRef} className="pt-8 border-t border-border">
            <h3 className="font-semibold mb-2">{content.contactTitle}</h3><p className="text-muted-foreground">{content.contactText}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={() => openContact(kind === 'privacy' ? 'privacy' : 'legal')} variant="outline" className="rounded-full h-11 px-6">{content.primaryContact}</Button>
              <Button onClick={() => openContact(kind === 'privacy' ? 'data-protection' : 'general')} variant="ghost" className="rounded-full h-11 px-6 text-muted-foreground">{content.secondaryContact}</Button>
            </div>
          </section>
        </article>
      </main>
      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} defaultDepartment={department} />
    </div>
  );
}
