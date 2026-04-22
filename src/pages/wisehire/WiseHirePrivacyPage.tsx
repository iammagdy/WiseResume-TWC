import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactInquiryDialog, DepartmentValue } from '@/components/settings/ContactInquiryDialog';

const WH_BLUE = '#1D4ED8';
const WH_BLUE_BG = 'rgba(29,78,216,0.08)';
const WH_BLUE_BORDER = 'rgba(29,78,216,0.18)';

export default function WiseHirePrivacyPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [defaultDept, setDefaultDept] = useState<DepartmentValue>('privacy');
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
        <h1 className="text-sm font-semibold text-foreground">WiseHire Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe overflow-x-hidden">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-foreground">
          <div className="flex items-center gap-2 text-foreground pb-3 border-b border-border">
            <ShieldCheck className="w-5 h-5" style={{ color: WH_BLUE }} />
            <h2 className="text-lg font-bold">Privacy Policy</h2>
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: WH_BLUE_BG, color: WH_BLUE, border: `1px solid ${WH_BLUE_BORDER}` }}
            >
              WiseHire
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Effective Date: April 22, 2026 · Last Updated: April 22, 2026</p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Your privacy — and your candidates' privacy — matters to us. This policy explains what data WiseHire collects, how it is used, and how it is kept safe. By using WiseHire on behalf of your organization, you agree to these practices.
          </p>

          <NumberedSection n={1} title="What We Collect">
            <p><strong className="text-foreground">Recruiter Account Info:</strong> Your email, full name, job title, and company name. If you sign in via SSO, we receive your name and email from your identity provider — never your password.</p>
            <p className="mt-3"><strong className="text-foreground">Organization Data:</strong> Company name, size, and hiring team structure (members, roles, permissions).</p>
            <p className="mt-3"><strong className="text-foreground">Candidate Data:</strong> CVs, cover letters, application records, screening scores, interview notes, and pipeline status — uploaded or created by your team on behalf of candidates you are actively evaluating.</p>
            <p className="mt-3"><strong className="text-foreground">Job Data:</strong> Job descriptions, role briefs, scorecard templates, and pipeline configurations created by your team.</p>
            <p className="mt-3"><strong className="text-foreground">Usage Data:</strong> Anonymized, aggregated analytics on feature usage and session activity — used to improve WiseHire.</p>
            <p className="mt-3"><strong className="text-foreground">Device Info:</strong> Device type, OS, and browser — used for compatibility and debugging.</p>
          </NumberedSection>

          <NumberedSection n={2} title="How We Use It">
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Deliver WiseHire's core features: candidate screening, brief generation, pipeline management, scorecards, talent pool, and analytics.</li>
              <li>Keep your organization's account and candidate data secure.</li>
              <li>Send essential notifications — role updates, invite confirmations, and security alerts.</li>
              <li>Improve the platform using anonymized, aggregated insights (never individual candidate or recruiter data).</li>
            </ul>
          </NumberedSection>

          <NumberedSection n={3} title="Candidate Data Handling">
            <p>WiseHire processes candidate data only at your direction — to run screening, generate briefs, or populate your pipeline. Candidate data is:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Never shared</strong> with other WiseHire customers.</li>
              <li><strong className="text-foreground">Never sold</strong> or traded to third parties.</li>
              <li><strong className="text-foreground">Deleted within 30 days</strong> of you removing a candidate record or closing your account.</li>
              <li>Processed by AI models only when your team explicitly triggers a screening or analysis action — the model does not retain the data after responding.</li>
            </ul>
            <p className="mt-3">You are responsible for obtaining the necessary consents from candidates to use WiseHire to process their application data, in accordance with applicable laws (GDPR, CCPA, and others).</p>
          </NumberedSection>

          <section className="space-y-3 rounded-xl p-4" style={{ background: WH_BLUE_BG, border: `1px solid ${WH_BLUE_BORDER}` }}>
            <h3 className="font-bold flex items-center gap-2 uppercase tracking-tight text-xs" style={{ color: WH_BLUE }}>
              <Sparkles className="w-3 h-3" />
              AI &amp; Your Data
            </h3>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-muted-foreground">
              <li><strong className="text-foreground">On-demand only:</strong> Candidate data is sent to AI models only when your team requests a screening action or brief. Nothing is retained by the model after the response is returned.</li>
              <li><strong className="text-foreground">No training:</strong> Your candidate data, job descriptions, and screening results are never used to train or fine-tune any AI model — ours or anyone else's.</li>
              <li><strong className="text-foreground">No selling:</strong> We do not share any data with AI companies, data brokers, or third parties for commercial purposes.</li>
              <li><strong className="text-foreground">Bias mitigation:</strong> Our AI prompts are designed to focus on job-relevant factors and omit protected characteristics. You should review all AI outputs before making hiring decisions.</li>
            </ul>
          </section>

          <NumberedSection n={5} title="Data Retention for HR Workflows">
            <p>While your subscription is active, WiseHire retains:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Active pipeline &amp; candidate records:</strong> Retained as long as your organization's account is active.</li>
              <li><strong className="text-foreground">Talent pool:</strong> Retained until you remove a candidate or close your account.</li>
              <li><strong className="text-foreground">Analytics &amp; aggregated reports:</strong> Retained for up to 12 months after account closure in anonymized form.</li>
            </ul>
            <p className="mt-3">You may export your organization's data at any time from WiseHire settings before closing your account.</p>
          </NumberedSection>

          <NumberedSection n={6} title="Security">
            <p>We take security seriously:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Encrypted at rest:</strong> All data is encrypted with AES-256.</li>
              <li><strong className="text-foreground">Encrypted in transit:</strong> All connections use TLS 1.3.</li>
              <li><strong className="text-foreground">Access control:</strong> Role-based permissions limit data access to authorized team members only.</li>
              <li><strong className="text-foreground">Infrastructure:</strong> Hosted on SOC 2 Type II compliant cloud providers.</li>
            </ul>
          </NumberedSection>

          <NumberedSection n={7} title="Sharing with Hiring Teams &amp; Clients">
            <p>Within your organization, candidate data is visible only to team members with the appropriate permissions. If your organization uses WiseHire in an agency or multi-client context:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>You control which candidates and pipeline stages are shared with each client.</li>
              <li>WiseHire provides the sharing mechanics; your organization is responsible for the appropriateness of each share.</li>
              <li>We do not expose your candidate data to other WiseHire customers under any circumstance.</li>
            </ul>
          </NumberedSection>

          <NumberedSection n={8} title="Your Rights">
            <p>Recruiter account holders and their organizations can:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-foreground">Access</strong> all data held by WiseHire for your organization.</li>
              <li><strong className="text-foreground">Correct</strong> your account and organization info.</li>
              <li><strong className="text-foreground">Delete</strong> candidate records or your entire account.</li>
              <li><strong className="text-foreground">Export</strong> your pipeline, candidate records, and analytics in JSON or CSV.</li>
              <li><strong className="text-foreground">Restrict processing</strong> by contacting our <DeptLink dept="privacy">Privacy Team</DeptLink>.</li>
            </ul>
            <p className="mt-3">Candidates whose data has been processed through WiseHire may also exercise data rights — direct them to our <DeptLink dept="privacy">Privacy Team</DeptLink>, and we will assist within statutory timelines.</p>
          </NumberedSection>

          <section ref={contactRef} className="pt-8 border-t border-border">
            <h3 className="text-foreground font-semibold mb-2">Contact Our Team</h3>
            <p className="text-muted-foreground">Questions about candidate data, your organization's data, or this policy?</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => scrollAndOpenContact('privacy')}
                variant="outline"
                className="rounded-full h-11 px-6"
                style={{ borderColor: WH_BLUE_BORDER, color: WH_BLUE }}
              >
                Privacy Team
              </Button>
              <Button
                onClick={() => scrollAndOpenContact('data-protection')}
                variant="ghost"
                className="rounded-full h-11 px-6 text-muted-foreground"
              >
                Data Protection
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
        <span dangerouslySetInnerHTML={{ __html: title }} />
      </h3>
      <div className="pl-8 border-l border-border text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
