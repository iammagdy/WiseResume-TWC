import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Plus, Shield, BookOpen, Heart, Compass, Briefcase, MoreHorizontal, Check, X } from 'lucide-react';
import { GapInfo } from '@/lib/dateUtils';
import { Experience } from '@/types/resume';
import { supabase } from '@/integrations/supabase/safeClient';

import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';

interface GapFillerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  gap: GapInfo | null;
  experiences: Experience[];
  onAddExperience: (exp: Experience) => void;
}

interface Suggestion {
  title: string;
  company: string;
  description: string;
  achievements: string[];
}

const CATEGORIES = [
  { id: 'military', label: 'Military Service', icon: Shield },
  { id: 'freelance', label: 'Freelance/Contract', icon: Briefcase },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'caregiving', label: 'Caregiving', icon: Heart },
  { id: 'sabbatical', label: 'Sabbatical', icon: Compass },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
] as const;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatParsedDate(d: { month: number; year: number; isPresent?: boolean }) {
  if (d.isPresent) return 'Present';
  return `${MONTH_NAMES[d.month]} ${d.year}`;
}

export function GapFillerSheet({ isOpen, onClose, gap, experiences, onAddExperience }: GapFillerSheetProps) {
  const [category, setCategory] = useState<string>('');
  const [userDescription, setUserDescription] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editedSuggestion, setEditedSuggestion] = useState<Suggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync editedSuggestion when selection changes
  useEffect(() => {
    if (selectedIndex !== null && suggestions[selectedIndex]) {
      setEditedSuggestion({ ...suggestions[selectedIndex], achievements: [...suggestions[selectedIndex].achievements] });
    } else {
      setEditedSuggestion(null);
    }
  }, [selectedIndex, suggestions]);

  

  const resetState = () => {
    setCategory('');
    setUserDescription('');
    setSuggestions([]);
    setSelectedIndex(null);
    setEditedSuggestion(null);
    setIsGenerating(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Find surrounding jobs for context
  const getSurroundingJobs = () => {
    if (!gap) return { previousJob: undefined, nextJob: undefined };

    const sorted = [...experiences]
      .filter(e => e.startDate)
      .sort((a, b) => {
        const aYear = parseInt(a.startDate.match(/\d{4}/)?.[0] || '0');
        const bYear = parseInt(b.startDate.match(/\d{4}/)?.[0] || '0');
        return aYear - bYear;
      });

    let previousJob: { position: string; company: string } | undefined;
    let nextJob: { position: string; company: string } | undefined;

    for (const exp of sorted) {
      const year = parseInt(exp.startDate.match(/\d{4}/)?.[0] || '0');
      if (year <= gap.startDate.year && exp.position) {
        previousJob = { position: exp.position, company: exp.company };
      }
      if (year >= gap.endDate.year && exp.position && !nextJob) {
        nextJob = { position: exp.position, company: exp.company };
      }
    }

    return { previousJob, nextJob };
  };

  const handleSuggest = async () => {
    if (!gap || !category) return;

    setIsGenerating(true);
    setSuggestions([]);
    setSelectedIndex(null);
    haptics.light();

    try {
      const { previousJob, nextJob } = getSurroundingJobs();

      const { data, error } = await supabase.functions.invoke('fill-gap', {
        body: {
          gap: {
            startDate: formatParsedDate(gap.startDate),
            endDate: formatParsedDate(gap.endDate),
            months: gap.months,
          },
          category,
          userDescription,
          previousJob,
          nextJob,
        },
      });

      if (error) {
        console.error('fill-gap error:', error);
        toast.error('Failed to generate suggestions. Please try again.');
        return;
      }

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions.slice(0, 3));
        haptics.success();
      } else {
        toast.error('Unexpected AI response. Please try again.');
      }
    } catch (err) {
      console.error('fill-gap error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAchievementChange = (index: number, value: string) => {
    if (!editedSuggestion) return;
    const updated = [...editedSuggestion.achievements];
    updated[index] = value;
    setEditedSuggestion({ ...editedSuggestion, achievements: updated });
  };

  const handleRemoveAchievement = (index: number) => {
    if (!editedSuggestion) return;
    setEditedSuggestion({ ...editedSuggestion, achievements: editedSuggestion.achievements.filter((_, i) => i !== index) });
  };

  const handleAddAchievement = () => {
    if (!editedSuggestion) return;
    setEditedSuggestion({ ...editedSuggestion, achievements: [...editedSuggestion.achievements, ''] });
  };

  const handleAddToResume = () => {
    if (!editedSuggestion || !gap) return;

    const newExp: Experience = {
      id: uuidv4(),
      company: editedSuggestion.company,
      position: editedSuggestion.title,
      startDate: formatParsedDate(gap.startDate),
      endDate: formatParsedDate(gap.endDate),
      current: false,
      description: editedSuggestion.description,
      achievements: editedSuggestion.achievements.filter(a => a.trim()),
    };

    haptics.success();
    onAddExperience(newExp);
    toast.success('Experience added! Gap resolved.');
    handleClose();
  };

  if (!gap) return null;

  const gapLabel = `${formatParsedDate(gap.startDate)} — ${formatParsedDate(gap.endDate)}`;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="glass-elevated rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-fluid-lg font-bold">Fill Employment Gap</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Gap period: <span className="font-medium text-foreground">{gapLabel}</span>
            <span className="ml-2 text-xs">({gap.months} month{gap.months > 1 ? 's' : ''})</span>
          </p>
        </SheetHeader>

        <div className="space-y-5">
          {/* Category chips */}
          <div>
            <p className="text-sm font-medium mb-3">What did you do during this time?</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      haptics.light();
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all active:scale-95 min-h-[44px] ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description input */}
          <div>
            <p className="text-sm font-medium mb-2">Tell us briefly what you did</p>
            <Textarea
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder="e.g., I worked as HR at Whitewell, or I served in the Navy..."
              className="min-h-[80px] resize-none glass-input"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{userDescription.length}/500</p>
          </div>

          {/* Suggest button */}
          <Button
            onClick={handleSuggest}
            disabled={!category || isGenerating}
            className="w-full gap-2 min-h-[48px] active:scale-95 transition-transform"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating suggestions...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Suggest Titles
              </>
            )}
          </Button>

          {/* AI Suggestions */}
          <AnimatePresence mode="wait">
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-sm font-medium">Choose a suggestion:</p>
                {suggestions.map((suggestion, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        onClick={() => {
                          setSelectedIndex(index);
                          haptics.light();
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{suggestion.company}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        {!isSelected && (
                          <>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{suggestion.description}</p>
                            {suggestion.achievements.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {suggestion.achievements.slice(0, 2).map((a, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span className="line-clamp-1">{a}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </button>

                      {/* Inline edit form for selected suggestion */}
                      <AnimatePresence>
                        {isSelected && editedSuggestion && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 p-4 rounded-xl border border-primary/20 bg-card space-y-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Job Title</Label>
                                <Input
                                  value={editedSuggestion.title}
                                  onChange={(e) => setEditedSuggestion({ ...editedSuggestion, title: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Company</Label>
                                <Input
                                  value={editedSuggestion.company}
                                  onChange={(e) => setEditedSuggestion({ ...editedSuggestion, company: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <Textarea
                                  value={editedSuggestion.description}
                                  onChange={(e) => setEditedSuggestion({ ...editedSuggestion, description: e.target.value })}
                                  className="mt-1 min-h-[60px] resize-none"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Achievements</Label>
                                <div className="space-y-2 mt-1">
                                  {editedSuggestion.achievements.map((achievement, aIdx) => (
                                    <div key={aIdx} className="flex items-center gap-2">
                                      <Input
                                        value={achievement}
                                        onChange={(e) => handleAchievementChange(aIdx, e.target.value)}
                                        placeholder="Achievement..."
                                        className="flex-1"
                                      />
                                      <button
                                        onClick={() => handleRemoveAchievement(aIdx)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddAchievement}
                                    className="gap-1 text-xs text-muted-foreground"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add achievement
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Add to Resume button */}
                <Button
                  onClick={handleAddToResume}
                  disabled={!editedSuggestion}
                  className="w-full gap-2 min-h-[48px] active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  Add to Resume
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
