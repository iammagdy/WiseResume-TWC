import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Check, User, Briefcase, GraduationCap, Wrench, Award,
  Globe, FolderGit2, Heart, FileText, Mail, Phone, MapPin, Linkedin,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  defaultSelection, filterProfile, selectionCount,
  type ExtractedProfile, type ProfileSelection,
} from '@/lib/onboardingProfile';

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ExtractedProfile | null;
  onConfirm: (filtered: ExtractedProfile) => void;
  isSaving?: boolean;
}

function ItemRow({
  checked, onToggle, title, subtitle,
}: { checked: boolean; onToggle: () => void; title: string; subtitle?: string }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer touch-manipulation">
      <div className="flex items-center justify-center w-9 h-9 -m-1.5 shrink-0">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="h-5 w-5 rounded-md" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </label>
  );
}

function SectionHeader({
  icon, label, count, allChecked, onToggleAll,
}: { icon: React.ReactNode; label: string; count: number; allChecked: boolean; onToggleAll: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
      </div>
      <button
        type="button"
        onClick={onToggleAll}
        className="text-xs font-medium text-primary hover:underline"
      >
        {allChecked ? 'Deselect all' : 'Select all'}
      </button>
    </div>
  );
}

export function OnboardingProfileReviewSheet({ open, onClose, profile, onConfirm, isSaving }: Props) {
  const [sel, setSel] = useState<ProfileSelection | null>(null);

  useEffect(() => {
    if (profile && open) setSel(defaultSelection(profile));
  }, [profile, open]);

  if (!profile || !sel) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader><SheetTitle>Review</SheetTitle></SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const update = (patch: Partial<ProfileSelection>) => setSel((s) => ({ ...(s as ProfileSelection), ...patch }));
  const toggleSetItem = (key: 'experienceIds' | 'educationIds' | 'certIds' | 'languageIds' | 'projectIds' | 'volunteeringIds', id: string) => {
    setSel((s) => {
      if (!s) return s;
      const next = new Set(s[key]);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...s, [key]: next };
    });
  };
  const toggleSkill = (i: number) => {
    setSel((s) => {
      if (!s) return s;
      const next = new Set(s.skillIndices);
      if (next.has(i)) next.delete(i); else next.add(i);
      return { ...s, skillIndices: next };
    });
  };
  const toggleAllOf = (key: 'experienceIds' | 'educationIds' | 'certIds' | 'languageIds' | 'projectIds' | 'volunteeringIds', all: string[]) => {
    setSel((s) => {
      if (!s) return s;
      const allChecked = s[key].size === all.length && all.length > 0;
      return { ...s, [key]: allChecked ? new Set<string>() : new Set(all) };
    });
  };
  const toggleAllSkills = () => {
    setSel((s) => {
      if (!s) return s;
      const all = profile.skills.map((_, i) => i);
      const allChecked = s.skillIndices.size === all.length && all.length > 0;
      return { ...s, skillIndices: allChecked ? new Set<number>() : new Set(all) };
    });
  };

  const count = selectionCount(sel);
  const handleConfirm = () => onConfirm(filterProfile(profile, sel));

  const has = {
    contact: profile.fullName || profile.email || profile.phone || profile.location || profile.linkedinUrl || profile.jobTitle,
    summary: !!profile.summary,
    experience: profile.experience.length > 0,
    education: profile.education.length > 0,
    skills: profile.skills.length > 0,
    certs: profile.certifications.length > 0,
    languages: profile.languages.length > 0,
    projects: profile.projects.length > 0,
    volunteering: profile.volunteering.length > 0,
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] max-h-[92vh] flex flex-col">
        <SheetHeader className="text-left pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">Review &amp; confirm</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Pick which items to add to your profile. Uncheck anything you don't want.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-6">
            {/* Personal info */}
            {has.contact && (
              <section>
                <SectionHeader
                  icon={<User className="w-4 h-4" />}
                  label="Personal info"
                  count={[profile.fullName, profile.email, profile.phone, profile.location, profile.linkedinUrl, profile.jobTitle].filter(Boolean).length}
                  allChecked={
                    // True iff every present personal-info field is currently selected.
                    (!profile.fullName || sel.fullName) &&
                    (!profile.email || sel.email) &&
                    (!profile.phone || sel.phone) &&
                    (!profile.location || sel.location) &&
                    (!profile.linkedinUrl || sel.linkedinUrl) &&
                    (!profile.jobTitle || sel.jobTitle) &&
                    (!!profile.fullName || !!profile.email || !!profile.phone || !!profile.location || !!profile.linkedinUrl || !!profile.jobTitle)
                  }
                  onToggleAll={() => {
                    // "All on" only counts present fields.
                    const allOn =
                      (!profile.fullName || sel.fullName) &&
                      (!profile.email || sel.email) &&
                      (!profile.phone || sel.phone) &&
                      (!profile.location || sel.location) &&
                      (!profile.linkedinUrl || sel.linkedinUrl) &&
                      (!profile.jobTitle || sel.jobTitle);
                    update({
                      fullName: !allOn && !!profile.fullName,
                      email: !allOn && !!profile.email,
                      phone: !allOn && !!profile.phone,
                      location: !allOn && !!profile.location,
                      linkedinUrl: !allOn && !!profile.linkedinUrl,
                      jobTitle: !allOn && !!profile.jobTitle,
                    });
                  }}
                />
                <div className="space-y-2">
                  {profile.fullName && <ItemRow checked={sel.fullName} onToggle={() => update({ fullName: !sel.fullName })} title={profile.fullName} subtitle="Full name" />}
                  {profile.jobTitle && <ItemRow checked={sel.jobTitle} onToggle={() => update({ jobTitle: !sel.jobTitle })} title={profile.jobTitle} subtitle="Current job title" />}
                  {profile.email && <ItemRow checked={sel.email} onToggle={() => update({ email: !sel.email })} title={profile.email} subtitle="Email" />}
                  {profile.phone && <ItemRow checked={sel.phone} onToggle={() => update({ phone: !sel.phone })} title={profile.phone} subtitle="Phone" />}
                  {profile.location && <ItemRow checked={sel.location} onToggle={() => update({ location: !sel.location })} title={profile.location} subtitle="Location" />}
                  {profile.linkedinUrl && <ItemRow checked={sel.linkedinUrl} onToggle={() => update({ linkedinUrl: !sel.linkedinUrl })} title={profile.linkedinUrl} subtitle="LinkedIn URL" />}
                </div>
              </section>
            )}

            {/* Summary */}
            {has.summary && (
              <section>
                <SectionHeader
                  icon={<FileText className="w-4 h-4" />}
                  label="Summary"
                  count={1}
                  allChecked={sel.summary}
                  onToggleAll={() => update({ summary: !sel.summary })}
                />
                <ItemRow
                  checked={sel.summary}
                  onToggle={() => update({ summary: !sel.summary })}
                  title={profile.summary!.slice(0, 80) + (profile.summary!.length > 80 ? '…' : '')}
                  subtitle={profile.summary!.length > 80 ? `${profile.summary!.length} chars` : undefined}
                />
              </section>
            )}

            {/* Experience */}
            {has.experience && (
              <section>
                <SectionHeader
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Experience"
                  count={profile.experience.length}
                  allChecked={sel.experienceIds.size === profile.experience.length}
                  onToggleAll={() => toggleAllOf('experienceIds', profile.experience.map((e) => e.id))}
                />
                <div className="space-y-2">
                  {profile.experience.map((e) => (
                    <ItemRow
                      key={e.id}
                      checked={sel.experienceIds.has(e.id)}
                      onToggle={() => toggleSetItem('experienceIds', e.id)}
                      title={`${e.title || 'Role'} — ${e.company || 'Company'}`}
                      subtitle={[e.startDate, e.endDate || (e.current ? 'Present' : '')].filter(Boolean).join(' – ') || undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {has.education && (
              <section>
                <SectionHeader
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Education"
                  count={profile.education.length}
                  allChecked={sel.educationIds.size === profile.education.length}
                  onToggleAll={() => toggleAllOf('educationIds', profile.education.map((e) => e.id))}
                />
                <div className="space-y-2">
                  {profile.education.map((e) => (
                    <ItemRow
                      key={e.id}
                      checked={sel.educationIds.has(e.id)}
                      onToggle={() => toggleSetItem('educationIds', e.id)}
                      title={[e.degree, e.field].filter(Boolean).join(' in ') || e.institution}
                      subtitle={[e.institution, [e.startYear, e.endYear].filter(Boolean).join(' – ')].filter(Boolean).join(' • ')}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {has.skills && (
              <section>
                <SectionHeader
                  icon={<Wrench className="w-4 h-4" />}
                  label="Skills"
                  count={profile.skills.length}
                  allChecked={sel.skillIndices.size === profile.skills.length}
                  onToggleAll={toggleAllSkills}
                />
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => {
                    const on = sel.skillIndices.has(i);
                    return (
                      <button
                        key={`${s}-${i}`}
                        type="button"
                        onClick={() => toggleSkill(i)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {on && <Check className="w-3 h-3 inline mr-1" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Certifications */}
            {has.certs && (
              <section>
                <SectionHeader
                  icon={<Award className="w-4 h-4" />}
                  label="Certifications"
                  count={profile.certifications.length}
                  allChecked={sel.certIds.size === profile.certifications.length}
                  onToggleAll={() => toggleAllOf('certIds', profile.certifications.map((c) => c.id))}
                />
                <div className="space-y-2">
                  {profile.certifications.map((c) => (
                    <ItemRow
                      key={c.id}
                      checked={sel.certIds.has(c.id)}
                      onToggle={() => toggleSetItem('certIds', c.id)}
                      title={c.name}
                      subtitle={[c.organization, c.date].filter(Boolean).join(' • ') || undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {has.languages && (
              <section>
                <SectionHeader
                  icon={<Globe className="w-4 h-4" />}
                  label="Languages"
                  count={profile.languages.length}
                  allChecked={sel.languageIds.size === profile.languages.length}
                  onToggleAll={() => toggleAllOf('languageIds', profile.languages.map((l) => l.id))}
                />
                <div className="space-y-2">
                  {profile.languages.map((l) => (
                    <ItemRow
                      key={l.id}
                      checked={sel.languageIds.has(l.id)}
                      onToggle={() => toggleSetItem('languageIds', l.id)}
                      title={l.language}
                      subtitle={l.proficiency || undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {has.projects && (
              <section>
                <SectionHeader
                  icon={<FolderGit2 className="w-4 h-4" />}
                  label="Projects"
                  count={profile.projects.length}
                  allChecked={sel.projectIds.size === profile.projects.length}
                  onToggleAll={() => toggleAllOf('projectIds', profile.projects.map((p) => p.id))}
                />
                <div className="space-y-2">
                  {profile.projects.map((p) => (
                    <ItemRow
                      key={p.id}
                      checked={sel.projectIds.has(p.id)}
                      onToggle={() => toggleSetItem('projectIds', p.id)}
                      title={p.name}
                      subtitle={p.description ? p.description.slice(0, 80) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Volunteering */}
            {has.volunteering && (
              <section>
                <SectionHeader
                  icon={<Heart className="w-4 h-4" />}
                  label="Volunteering"
                  count={profile.volunteering.length}
                  allChecked={sel.volunteeringIds.size === profile.volunteering.length}
                  onToggleAll={() => toggleAllOf('volunteeringIds', profile.volunteering.map((v) => v.id))}
                />
                <div className="space-y-2">
                  {profile.volunteering.map((v) => (
                    <ItemRow
                      key={v.id}
                      checked={sel.volunteeringIds.has(v.id)}
                      onToggle={() => toggleSetItem('volunteeringIds', v.id)}
                      title={`${v.role} — ${v.organization}`}
                      subtitle={[v.startDate, v.endDate].filter(Boolean).join(' – ') || undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {!has.contact && !has.summary && !has.experience && !has.education && !has.skills && !has.certs && !has.languages && !has.projects && !has.volunteering && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                We couldn't extract anything. Try a different option from the previous step.
              </div>
            )}
          </motion.div>
        </ScrollArea>

        <div className="pt-4 pb-safe border-t border-border shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="h-12 rounded-xl">
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || count === 0}
            className="flex-1 h-12 text-base font-semibold rounded-xl"
          >
            <Check className="w-5 h-5 mr-2" />
            {isSaving ? 'Saving…' : `Add ${count} item${count === 1 ? '' : 's'} to my profile`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
