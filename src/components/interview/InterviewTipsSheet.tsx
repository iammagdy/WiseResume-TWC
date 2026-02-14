import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface InterviewTipsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewTipsSheet({ open, onOpenChange }: InterviewTipsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] pb-safe overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Interview Tips</SheetTitle>
        </SheetHeader>

        <Accordion type="single" collapsible className="pt-4">
          <AccordionItem value="star">
            <AccordionTrigger className="text-sm font-semibold">⭐ STAR Method</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Situation:</strong> Set the scene. Where were you? What was the context?</p>
              <p><strong>Task:</strong> What was your responsibility? What problem needed solving?</p>
              <p><strong>Action:</strong> What specific steps did YOU take? Use "I" not "we".</p>
              <p><strong>Result:</strong> What was the outcome? Quantify with numbers when possible.</p>
              <div className="bg-muted/30 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-foreground mb-1">Example:</p>
                <p className="text-xs italic">"When our team's deployment pipeline was causing 2-hour delays (S), I was tasked with optimizing it (T). I implemented CI/CD with GitHub Actions and parallel testing (A), reducing deployment time by 85% from 2 hours to 18 minutes (R)."</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="body">
            <AccordionTrigger className="text-sm font-semibold">🤝 Body Language Tips</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-1">
              <p>✅ Maintain eye contact (look at the webcam for virtual)</p>
              <p>✅ Sit up straight with shoulders back</p>
              <p>✅ Use hand gestures naturally</p>
              <p>✅ Smile genuinely when greeting</p>
              <p>✅ Nod to show active listening</p>
              <p>❌ Avoid crossing arms</p>
              <p>❌ Don't fidget or tap</p>
              <p>❌ Don't look away when answering</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mistakes">
            <AccordionTrigger className="text-sm font-semibold">⚠️ Common Mistakes</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-1">
              <p>• Not researching the company beforehand</p>
              <p>• Giving generic answers without specific examples</p>
              <p>• Speaking negatively about previous employers</p>
              <p>• Not asking any questions at the end</p>
              <p>• Rambling — keep answers to 1-2 minutes</p>
              <p>• Not preparing your own questions</p>
              <p>• Forgetting to follow up with a thank-you email</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="salary">
            <AccordionTrigger className="text-sm font-semibold">💰 Salary Negotiation</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>When asked about expectations:</strong></p>
              <p className="italic">"Based on my research and experience, I'm looking for a range of $X to $Y. I'm open to discussing the full compensation package including benefits."</p>
              <p><strong>When given an offer:</strong></p>
              <p className="italic">"Thank you for the offer. I'm excited about the role. Could we discuss the compensation? Based on market data and my experience, I was hoping for something closer to $X."</p>
              <p><strong>Key tips:</strong></p>
              <p>• Always research salary ranges on Glassdoor/Levels.fyi first</p>
              <p>• Never give a number first if possible</p>
              <p>• Consider total compensation (equity, benefits, PTO)</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="questions">
            <AccordionTrigger className="text-sm font-semibold">❓ Questions to Ask</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-1">
              <p>1. "What does a typical day look like in this role?"</p>
              <p>2. "What are the biggest challenges the team is facing?"</p>
              <p>3. "How do you measure success for this position?"</p>
              <p>4. "What opportunities are there for professional development?"</p>
              <p>5. "Can you tell me about the team I'd be working with?"</p>
              <p>6. "What's the company's approach to work-life balance?"</p>
              <p>7. "Where do you see the company in the next 2-3 years?"</p>
              <p>8. "What's the onboarding process like?"</p>
              <p>9. "Is there anything about my background that concerns you?"</p>
              <p>10. "What are the next steps in the interview process?"</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="thankyou">
            <AccordionTrigger className="text-sm font-semibold">📧 Thank You Email Template</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p><strong>Subject:</strong> Thank you — [Job Title] Interview</p>
                <p>Dear [Interviewer Name],</p>
                <p>Thank you for taking the time to speak with me today about the [Job Title] position. I really enjoyed learning more about [specific topic discussed].</p>
                <p>Our conversation reinforced my enthusiasm for the role, particularly [specific aspect]. I believe my experience in [relevant skill] would allow me to contribute meaningfully to [team/project].</p>
                <p>Please don't hesitate to reach out if you need any additional information. I look forward to hearing about next steps.</p>
                <p>Best regards,<br />[Your Name]</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}
