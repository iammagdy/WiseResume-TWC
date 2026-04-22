import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, DepartmentValue } from '@/components/settings/ContactInquiryDialog';

const WH_BLUE = '#1D4ED8';
const WH_BLUE_BG = 'rgba(29,78,216,0.08)';
const WH_BLUE_BORDER = 'rgba(29,78,216,0.18)';

export default function WiseHireTermsPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [defaultDept, setDefaultDept] = useState<DepartmentValue>('general');
  const contactRef = useRef<HTMLElement>(null);

  const scrollAndOpenContact = useCallback((dept: DepartmentValue) => {
    setDefaultDept(dept);
    contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setContactOpen(true), 400);
  }, []);

  const DeptLink = ({ dept, children }: { dept: DepartmentValue; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => scrollAndOpenContact(dept)}
      style={{ color: WH_BLUE }}
      className="underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity inline"
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 h-12 flex items-center gap-3">
        <Link to="/enterprises">
          <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Back to WiseHire">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-sm font-semibold text-foreground">WiseHire Terms of Service</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-foreground">
          <div className="flex items-center gap-2 text-foreground pb-3 border-b border-border">
            <FileText className="w-5 h-5" style={{ color: WH_BLUE }} />
            <h2 className="text-lg font-bold">Terms of Service</h2>
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: WH_BLUE_BG, color: WH_BLUE, border: `1px solid ${WH_BLUE_BORDER}` }}
            >
              WiseHire
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Effective Date: April 22, 2026 · Last Updated: April 22, 2026</p>
          <p className="text-base leading-relaxed text-muted-foreground">
            These Terms govern your use of WiseHire, the AI-powered hiring platform by The Wise Cloud. By creating an account or using WiseHire on behalf of your organization, you agree to these Terms. If you don't agree, please don't use WiseHire.
          </p>

          <NumberedSection n={1} title="Eligibility &amp; Organization Accounts">
            <p>You must be at least 18 years old and authorized to act on behalf of your organization to use WiseHire. By signing up, you confirm that you have the authority to bind your company or team to these Terms.</p>
            <p className="mt-3">Each WiseHire account belongs to an organization. Individual seats are granted to members of that organization by the account administrator. You are responsible for all activity by members under your organization's account.</p>
          </NumberedSection>

          <NumberedSection n={2} title="Recruiter &amp; Team Accounts">
            <p>WiseHire supports multi-seat team access. The account owner (admin) may invite colleagues, assign roles, and revoke access at any time. Please keep your credentials secure. If you suspect unauthorized access to your organization's account, contact our <DeptLink dept="general">Support</DeptLink> team immediately.</p>
          </NumberedSection>

          <NumberedSection n={3} title="Candidate Data &amp; Ownership">
            <p>Candidate data you upload, import, or generate within WiseHire — including CVs, application records, screening notes, and pipeline information — remains yours. WiseHire does not claim ownership of candidate data.</p>
            <p className="mt-3">You are responsible for obtaining any necessary consents from candidates to process their data using WiseHire's features. WiseHire processes candidate data solely to deliver the services you have requested.</p>
            <p className="mt-3">When you delete a candidate record or close your account, candidate data is removed from active systems within 30 days, subject to any legal retention obligations.</p>
          </NumberedSection>

          <section className="space-y-3 rounded-xl p-4" style={{ background: WH_BLUE_BG, border: `1px solid ${WH_BLUE_BORDER}` }}>
            <h3 className="font-bold flex items-center gap-2 uppercase tracking-tight text-xs" style={{ color: WH_BLUE }}>
              AI Screening &amp; Bias Disclaimer
            </h3>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-muted-foreground">
              <li>AI scoring and candidate briefs are <strong className="text-foreground">decision-support tools</strong>, not final hiring decisions.</li>
              <li>WiseHire's AI is designed to reduce bias, but no automated system is perfect. You are responsible for reviewing all AI outputs before acting on them.</li>
              <li>Hiring decisions remain entirely with your organization. WiseHire is not liable for hiring outcomes or employment decisions.</li>
              <li>Do not use WiseHire to discriminate on the basis of any protected characteristic.</li>
            </ul>
          </section>

          <NumberedSection n={5} title="Acceptable Use">
            <p>WiseHire is licensed for legitimate recruitment, talent sourcing, and hiring workflow purposes. You may not:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
              <li>Use WiseHire to screen candidates in violation of applicable employment or anti-discrimination laws.</li>
              <li>Share, resell, or sublicense access to WiseHire outside your organization.</li>
              <li>Scrape, reverse-engineer, or interfere with the platform.</li>
              <li>Upload candidate data you do not have the right to process.</li>
              <li>Use automated bots or bulk ingestion tools beyond those WiseHire explicitly supports.</li>
            </ul>
            <p className="mt-4 italic opacity-80">Violations may result in account suspension or termination.</p>
          </NumberedSection>

          <NumberedSection n={6} title="Job Description &amp; Brief Data">
            <p>Job descriptions, role briefs, scorecards, and pipeline configurations you create in WiseHire belong to your organization. WiseHire may use anonymized, aggregated patterns across all customers to improve platform features — your specific job content is never shared with other customers.</p>
          </NumberedSection>

          <NumberedSection n={7} title="Payments &amp; Subscriptions">
            <p>WiseHire is offered on subscription plans. For paid plans:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
              <li>Billing is recurring and charged at the start of each period.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period.</li>
              <li>Seat changes (upgrades/downgrades) are prorated.</li>
              <li>For billing questions or refund requests, contact our <DeptLink dept="billing">Billing</DeptLink> team.</li>
            </ul>
          </NumberedSection>

          <NumberedSection n={8} title="Data Retention for HR Workflows">
            <p>WiseHire retains your active pipeline, talent pool, and analytics data for as long as your subscription is active. Following account closure:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
              <li>Active pipeline and candidate records are deleted within 30 days.</li>
              <li>Anonymized aggregate analytics may be retained for up to 12 months.</li>
              <li>You may request an export of your organization's data before closing your account.</li>
            </ul>
          </NumberedSection>

          <NumberedSection n={9} title="Limitation of Liability">
            <p>WiseHire is provided "as is." To the extent permitted by law, our total liability to your organization is limited to the fees paid to WiseHire in the 12 months preceding the claim, or $500 USD — whichever is greater. WiseHire is not liable for hiring outcomes, employment decisions, or regulatory penalties arising from your use of the platform.</p>
          </NumberedSection>

          <section ref={contactRef} className="pt-8 border-t border-border">
            <h3 className="text-foreground font-semibold mb-2">Legal Help</h3>
            <p className="text-muted-foreground">Have a question about these Terms?</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => scrollAndOpenContact('legal')}
                variant="outline"
                className="rounded-full h-11 px-6"
                style={{ borderColor: WH_BLUE_BORDER, color: WH_BLUE }}
              >
                Legal Department
              </Button>
              <Button
                onClick={() => scrollAndOpenContact('general')}
                variant="ghost"
                className="rounded-full h-11 px-6 text-muted-foreground"
              >
                General Support
              </Button>
            </div>
          </section>
        </div>
      </main>

      <ContactInquiryDialog open={contactOpen} onOpenChange={setContactOpen} defaultDepartment={defaultDept} />
    </div>
  );
}

function NumberedSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-foreground font-semibold flex items-center gap-2">
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: WH_BLUE_BG, color: WH_BLUE }}
        >
          {n}
        </span>
        <span>{title}</span>
      </h3>
      <div className="pl-8 border-l border-border text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
