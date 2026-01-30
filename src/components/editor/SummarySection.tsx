import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { FileText } from 'lucide-react';

export function SummarySection() {
  const { currentResume, updateResume } = useResumeStore();

  if (!currentResume) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg mb-4">Professional Summary</h3>
      
      <div>
        <Label htmlFor="summary" className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Summary
        </Label>
        <Textarea
          id="summary"
          value={currentResume.summary}
          onChange={(e) => updateResume({ summary: e.target.value })}
          placeholder="Write a brief professional summary highlighting your key qualifications, experience, and career goals..."
          className="min-h-[200px] resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {currentResume.summary.length}/500 characters recommended
        </p>
      </div>

      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h4 className="font-semibold text-sm mb-2">Tips for a great summary</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Start with your years of experience and specialty</li>
          <li>• Include 2-3 key achievements with metrics</li>
          <li>• Mention skills relevant to your target role</li>
          <li>• Keep it concise (3-4 sentences)</li>
        </ul>
      </div>
    </div>
  );
}
