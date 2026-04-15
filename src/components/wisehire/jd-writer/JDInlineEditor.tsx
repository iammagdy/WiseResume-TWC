import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Copy, CheckCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface JDData {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

interface JDInlineEditorProps {
  jd: JDData;
  onSave?: (jdText: string) => Promise<void>;
  isSaving?: boolean;
}

function buildJdText(jd: JDData): string {
  return [
    `# ${jd.title}`,
    '',
    jd.summary,
    '',
    '## Responsibilities',
    ...jd.responsibilities.map((r) => `- ${r}`),
    '',
    '## Requirements',
    ...jd.requirements.map((r) => `- ${r}`),
    '',
    '## Benefits',
    ...(jd.benefits ?? []).map((b) => `- ${b}`),
  ].join('\n');
}

function Section({
  title,
  items,
  onItemChange,
}: {
  title: string;
  items: string[];
  onItemChange: (idx: number, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {title}
      </h3>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 text-slate-300 dark:text-slate-600 select-none">•</span>
          <Textarea
            value={item}
            onChange={(e) => onItemChange(i, e.target.value)}
            rows={1}
            className="flex-1 min-h-[36px] resize-none text-sm bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 rounded-none focus-visible:ring-0 focus-visible:border-blue-500 px-0 py-1"
          />
        </div>
      ))}
    </div>
  );
}

export function JDInlineEditor({ jd: initialJD, onSave, isSaving }: JDInlineEditorProps) {
  const [jd, setJd] = useState<JDData>(initialJD);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setJd(initialJD); }, [initialJD]);

  function updateItem(field: keyof Pick<JDData, 'responsibilities' | 'requirements' | 'benefits'>, idx: number, value: string) {
    setJd((prev) => {
      const arr = [...prev[field]];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildJdText(jd));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard.');
  }

  async function handleSave() {
    if (onSave) await onSave(buildJdText(jd));
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
          Job Title
        </label>
        <input
          type="text"
          value={jd.title}
          onChange={(e) => setJd((p) => ({ ...p, title: e.target.value }))}
          className="w-full text-xl font-extrabold text-slate-900 dark:text-white bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 py-1"
        />
      </div>

      {/* Summary */}
      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
          Summary
        </label>
        <Textarea
          value={jd.summary}
          onChange={(e) => setJd((p) => ({ ...p, summary: e.target.value }))}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <Section
        title="Responsibilities"
        items={jd.responsibilities}
        onItemChange={(i, v) => updateItem('responsibilities', i, v)}
      />
      <Section
        title="Requirements"
        items={jd.requirements}
        onItemChange={(i, v) => updateItem('requirements', i, v)}
      />
      <Section
        title="Benefits"
        items={jd.benefits ?? []}
        onItemChange={(i, v) => updateItem('benefits', i, v)}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onSave && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save JD
          </Button>
        )}
        <Button variant="outline" onClick={handleCopy}>
          {copied ? <CheckCheck className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
