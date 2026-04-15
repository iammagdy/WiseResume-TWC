import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Globe, Loader2, Copy, Check } from 'lucide-react';
import { useJDs, type WiseHireRole } from '@/hooks/wisehire/useJDs';
import { toast } from 'sonner';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

interface Props {
  role: WiseHireRole;
  companySlug: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PublishRoleSheet({ role, companySlug, open, onOpenChange }: Props) {
  const { publishRole } = useJDs();
  const [slug, setSlug] = useState(role.slug ?? slugify(role.title));
  const [location, setLocation] = useState(role.location ?? '');
  const [remoteOk, setRemoteOk] = useState(role.remote_ok ?? false);
  const [salaryMin, setSalaryMin] = useState(role.salary_min ? String(role.salary_min) : '');
  const [salaryMax, setSalaryMax] = useState(role.salary_max ? String(role.salary_max) : '');
  const [employmentType, setEmploymentType] = useState(role.employment_type ?? 'full_time');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(role.slug ?? slugify(role.title));
      setLocation(role.location ?? '');
      setRemoteOk(role.remote_ok ?? false);
      setSalaryMin(role.salary_min ? String(role.salary_min) : '');
      setSalaryMax(role.salary_max ? String(role.salary_max) : '');
      setEmploymentType(role.employment_type ?? 'full_time');
    }
  }, [open, role]);

  const publicUrl = companySlug && slug
    ? `${window.location.origin}/jobs/${companySlug}/${slug}`
    : null;

  function handleCopy() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleToggle(published: boolean) {
    if (published && !slug.trim()) {
      toast.error('A URL slug is required to publish.');
      return;
    }
    publishRole.mutate({
      roleId: role.id,
      published,
      slug: slug.trim() || undefined,
      location: location.trim() || undefined,
      remote_ok: remoteOk,
      salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
      salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
      employment_type: employmentType,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            Publish to Job Board
          </SheetTitle>
          <SheetDescription>
            Set the details for how this role appears publicly.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Published toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {role.published ? 'Live on job board' : 'Not published'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {role.published ? 'Candidates can see and apply.' : 'Hidden from public.'}
              </p>
            </div>
            <Switch
              checked={role.published}
              onCheckedChange={handleToggle}
              disabled={publishRole.isPending}
              aria-label="Publish role"
            />
          </div>

          {/* Public URL */}
          <div className="space-y-1.5">
            <Label className="text-xs">URL slug</Label>
            <div className="flex gap-2">
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="senior-engineer"
                className="h-8 text-sm font-mono flex-1"
              />
            </div>
            {publicUrl && (
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[11px] text-slate-400 truncate flex-1">{publicUrl}</p>
                <button onClick={handleCopy} className="text-slate-400 hover:text-blue-500 transition-colors shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Employment type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Employment type</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, NY or Remote"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={remoteOk}
              onCheckedChange={setRemoteOk}
              id="remote-ok"
            />
            <Label htmlFor="remote-ok" className="text-sm cursor-pointer">Remote OK</Label>
          </div>

          {/* Salary */}
          <div className="space-y-1.5">
            <Label className="text-xs">Salary range (annual, optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value.replace(/\D/g, ''))}
                placeholder="Min"
                className="h-8 text-sm"
              />
              <span className="text-slate-400 text-xs">to</span>
              <Input
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value.replace(/\D/g, ''))}
                placeholder="Max"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => handleToggle(!role.published)}
            disabled={publishRole.isPending}
          >
            {publishRole.isPending
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Globe className="h-4 w-4 mr-2" />}
            {role.published ? 'Unpublish role' : 'Save & Publish'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
