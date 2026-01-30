import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, Building2, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useResumeStore } from '@/store/resumeStore';
import { Experience } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

export function ExperienceSection() {
  const { currentResume, updateResume } = useResumeStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!currentResume) return null;

  const addExperience = () => {
    const newExp: Experience = {
      id: uuidv4(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: [],
    };
    updateResume({
      experience: [...currentResume.experience, newExp],
    });
    setExpandedId(newExp.id);
  };

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    updateResume({
      experience: currentResume.experience.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    });
  };

  const deleteExperience = (id: string) => {
    updateResume({
      experience: currentResume.experience.filter((exp) => exp.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Work Experience</h3>
        <Button variant="outline" size="sm" onClick={addExperience} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <AnimatePresence>
        {currentResume.experience.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-xl border border-dashed border-border text-center"
          >
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No work experience added yet</p>
            <Button variant="link" size="sm" onClick={addExperience} className="mt-2">
              Add your first position
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {currentResume.experience.map((exp, index) => (
              <motion.div
                key={exp.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border overflow-hidden"
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm">
                      {exp.position || `Position ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exp.company || 'Company name'}
                    </p>
                  </div>
                  {expandedId === exp.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {expandedId === exp.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Briefcase className="w-3 h-3" />
                              Position
                            </Label>
                            <Input
                              value={exp.position}
                              onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                              placeholder="Job Title"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Building2 className="w-3 h-3" />
                              Company
                            </Label>
                            <Input
                              value={exp.company}
                              onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                              placeholder="Company Name"
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              Start Date
                            </Label>
                            <Input
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                              placeholder="Jan 2020"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              End Date
                            </Label>
                            <Input
                              value={exp.current ? 'Present' : exp.endDate}
                              onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                              placeholder="Present"
                              disabled={exp.current}
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={exp.current}
                            onCheckedChange={(checked) => updateExperience(exp.id, { current: checked })}
                          />
                          <Label className="text-xs">Currently working here</Label>
                        </div>

                        <div>
                          <Label className="text-xs mb-1 block">Description</Label>
                          <Textarea
                            value={exp.description}
                            onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                            placeholder="Describe your responsibilities and achievements..."
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteExperience(exp.id)}
                          className="w-full gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Experience
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
